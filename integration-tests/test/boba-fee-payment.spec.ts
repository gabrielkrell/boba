import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
chai.use(chaiAsPromised)

/* Imports: External */
import { ethers, BigNumber, Contract, utils, ContractFactory } from 'ethers'
import { predeploys, getContractFactory } from '@eth-optimism/contracts'

/* Imports: Internal */
import { OptimismEnv } from './shared/env'
import { gasPriceOracleWallet } from './shared/utils'

/* Imports: ABI */
import Proxy__Boba_GasPriceOracleJson from '../artifacts/contracts/Proxy__Boba_GasPriceOracle.sol/Proxy__Boba_GasPriceOracle.json'

const setPrices = async (env: OptimismEnv, value: number | BigNumber) => {
  const gasPrice = await env.messenger.contracts.l2.OVM_GasPriceOracle.connect(
    gasPriceOracleWallet
  ).setGasPrice(value)
  await gasPrice.wait()
  const baseFee = await env.messenger.contracts.l2.OVM_GasPriceOracle.connect(
    gasPriceOracleWallet
  ).setL1BaseFee(value)
  await baseFee.wait()
}

describe('Boba Fee Payment Integration Tests', async () => {
  let env: OptimismEnv
  let L1Boba: Contract
  let L2Boba: Contract
  let Boba_GasPriceOracle: Contract

  let Factory__Proxy__Boba_GasPriceOracle: ContractFactory
  let Proxy__Boba_GasPriceOracle: Contract

  const other = '0x1234123412341234123412341234123412341234'

  before(async () => {
    env = await OptimismEnv.new()

    L1Boba = getContractFactory('BOBA')
      .attach(env.addressesBOBA.TOKENS.BOBA.L1)
      .connect(env.l1Wallet)
    L2Boba = getContractFactory('L2GovernanceERC20')
      .attach(predeploys.L2GovernanceERC20)
      .connect(env.l2Wallet)
    Boba_GasPriceOracle = getContractFactory('Boba_GasPriceOracle')
      .attach(predeploys.Boba_GasPriceOracle)
      .connect(env.l2Wallet)

    Factory__Proxy__Boba_GasPriceOracle = new ethers.ContractFactory(
      Proxy__Boba_GasPriceOracleJson.abi,
      Proxy__Boba_GasPriceOracleJson.bytecode,
      env.l2Wallet
    )

    Proxy__Boba_GasPriceOracle =
      await Factory__Proxy__Boba_GasPriceOracle.deploy(
        Boba_GasPriceOracle.address
      )
    await Proxy__Boba_GasPriceOracle.deployTransaction.wait()
  })

  it('{tag:boba} should register to use boba as the fee token', async () => {
    // Register l1wallet for using boba as the fee token
    const registerTx = await Boba_GasPriceOracle.useBobaAsFeeToken()
    await registerTx.wait()

    expect(
      await Boba_GasPriceOracle.bobaFeeTokenUsers(env.l2Wallet.address)
    ).to.be.deep.eq(true)
  })

  it('{tag:boba} should not register the fee tokens for non EOA accounts', async () => {
    await expect(Proxy__Boba_GasPriceOracle.useBobaAsFeeToken()).to.be.reverted
    await expect(Proxy__Boba_GasPriceOracle.useETHAsFeeToken()).to.be.reverted
  })

  it('{tag:boba} Paying a nonzero but acceptable boba gasPrice fee for transferring ETH', async () => {
    await setPrices(env, 1000)

    const amount = utils.parseEther('0.0000001')
    const ETHBalanceBefore = await env.l2Wallet.getBalance()
    const BobaBalanceBefore = await L2Boba.balanceOf(env.l2Wallet.address)
    const ETHFeeVaultBalanceBefore = await env.l2Wallet.provider.getBalance(
      predeploys.OVM_SequencerFeeVault
    )
    const BobaFeeVaultBalanceBefore = await L2Boba.balanceOf(
      Boba_GasPriceOracle.address
    )
    expect(ETHBalanceBefore.gt(amount))

    const unsigned = await env.l2Wallet.populateTransaction({
      to: other,
      value: amount,
      gasLimit: 500000,
    })

    const tx = await env.l2Wallet.sendTransaction(unsigned)
    const receipt = await tx.wait()
    expect(receipt.status).to.eq(1)

    const ETHBalanceAfter = await env.l2Wallet.getBalance()
    const BobaBalanceAfter = await L2Boba.balanceOf(env.l2Wallet.address)
    const ETHFeeVaultBalanceAfter = await env.l2Wallet.provider.getBalance(
      predeploys.OVM_SequencerFeeVault
    )
    const BobaFeeVaultBalanceAfter = await L2Boba.balanceOf(
      Boba_GasPriceOracle.address
    )

    const priceRatio = await Boba_GasPriceOracle.priceRatio()
    const txBobaFee = receipt.gasUsed.mul(tx.gasPrice).mul(priceRatio)

    // Make sure that user only pay transferred ETH
    expect(ETHBalanceBefore.sub(ETHBalanceAfter)).to.deep.equal(amount)

    // Make sure that the ETH Fee Vault doesn't change
    expect(ETHFeeVaultBalanceAfter).to.deep.equal(ETHFeeVaultBalanceBefore)

    // Make sure that we deduct boba from user's account
    expect(BobaBalanceBefore.sub(BobaBalanceAfter)).to.deep.equal(txBobaFee)

    // Make sure that the boba fee vault receives the tx fee
    expect(
      BobaFeeVaultBalanceAfter.sub(BobaFeeVaultBalanceBefore)
    ).to.deep.equal(txBobaFee)

    await setPrices(env, 1)
  })

  it('{tag:boba} Paying a nonzero but acceptable boba gasPrice fee for transferring BOBA', async () => {
    await setPrices(env, 1000)

    const amount = utils.parseEther('0.0000001')
    const ETHBalanceBefore = await env.l2Wallet.getBalance()
    const BobaBalanceBefore = await L2Boba.balanceOf(env.l2Wallet.address)
    const ETHFeeVaultBalanceBefore = await env.l2Wallet.provider.getBalance(
      predeploys.OVM_SequencerFeeVault
    )
    const BobaFeeVaultBalanceBefore = await L2Boba.balanceOf(
      Boba_GasPriceOracle.address
    )
    expect(BobaBalanceBefore.gt(amount))

    const tx = await L2Boba.transfer(other, amount)
    const receipt = await tx.wait()
    expect(receipt.status).to.eq(1)

    const ETHBalanceAfter = await env.l2Wallet.getBalance()
    const BobaBalanceAfter = await L2Boba.balanceOf(env.l2Wallet.address)
    const ETHFeeVaultBalanceAfter = await env.l2Wallet.provider.getBalance(
      predeploys.OVM_SequencerFeeVault
    )
    const BobaFeeVaultBalanceAfter = await L2Boba.balanceOf(
      Boba_GasPriceOracle.address
    )

    const priceRatio = await Boba_GasPriceOracle.priceRatio()
    const txBobaFee = receipt.gasUsed.mul(tx.gasPrice).mul(priceRatio)

    // Make sure that ETH balance doesn't change
    expect(ETHBalanceBefore).to.deep.equal(ETHBalanceAfter)

    // Make sure that the ETH Fee Vault doesn't change
    expect(ETHFeeVaultBalanceAfter).to.deep.equal(ETHFeeVaultBalanceBefore)

    // Make sure that we deduct boba from user's account
    expect(BobaBalanceBefore.sub(BobaBalanceAfter)).to.deep.equal(
      txBobaFee.add(amount)
    )

    // Make sure that the boba fee vault receives the tx fee
    expect(
      BobaFeeVaultBalanceAfter.sub(BobaFeeVaultBalanceBefore)
    ).to.deep.equal(txBobaFee)

    await setPrices(env, 1)
  })

  it("{tag:boba} Should revert if users don't have enough Boba tokens", async () => {
    await setPrices(env, 1000)

    const ETHBalanceBefore = await env.l2Wallet.getBalance()
    const BobaBalanceBefore = await L2Boba.balanceOf(env.l2Wallet.address)
    const ETHFeeVaultBalanceBefore = await env.l2Wallet.provider.getBalance(
      predeploys.OVM_SequencerFeeVault
    )
    const BobaFeeVaultBalanceBefore = await L2Boba.balanceOf(
      Boba_GasPriceOracle.address
    )
    await expect(L2Boba.transfer(other, BobaBalanceBefore)).to.be.revertedWith(
      'execution reverted: ERC20: transfer amount exceeds balance'
    )
    const ETHBalanceAfter = await env.l2Wallet.getBalance()
    const BobaBalanceAfter = await L2Boba.balanceOf(env.l2Wallet.address)
    const ETHFeeVaultBalanceAfter = await env.l2Wallet.provider.getBalance(
      predeploys.OVM_SequencerFeeVault
    )
    const BobaFeeVaultBalanceAfter = await L2Boba.balanceOf(
      Boba_GasPriceOracle.address
    )

    // Make sure that ETH balance doesn't change
    expect(ETHBalanceBefore).to.deep.equal(ETHBalanceAfter)

    // Make sure that the ETH Fee Vault doesn't change
    expect(ETHFeeVaultBalanceAfter).to.deep.equal(ETHFeeVaultBalanceBefore)

    // Make sure that we don't deduct boba from user's account
    expect(BobaBalanceBefore).to.deep.equal(BobaBalanceAfter)

    // Make sure that the boba fee vault doesn't change
    expect(BobaFeeVaultBalanceAfter).to.deep.equal(BobaFeeVaultBalanceBefore)

    await setPrices(env, 1)
  })

  it('{tag:boba} should compute correct boba fee for transferring ETH', async () => {
    await setPrices(env, 1000)

    const ETHBalanceBefore = await env.l2Wallet.getBalance()
    const BobaBalanceBefore = await L2Boba.balanceOf(env.l2Wallet.address)
    const ETHFeeVaultBalanceBefore = await env.l2Wallet.provider.getBalance(
      predeploys.OVM_SequencerFeeVault
    )
    const BobaFeeVaultBalanceBefore = await L2Boba.balanceOf(
      Boba_GasPriceOracle.address
    )
    const unsigned = await env.l2Wallet.populateTransaction({
      to: env.l2Wallet.address,
      value: 0,
    })

    const tx = await env.l2Wallet.sendTransaction(unsigned)
    const receipt = await tx.wait()
    const priceRatio = await Boba_GasPriceOracle.priceRatio()
    const txBobaFee = receipt.gasUsed.mul(tx.gasPrice).mul(priceRatio)
    const ETHBalanceAfter = await env.l2Wallet.getBalance()
    const BobaBalanceAfter = await L2Boba.balanceOf(env.l2Wallet.address)
    const ETHFeeVaultBalanceAfter = await env.l2Wallet.provider.getBalance(
      predeploys.OVM_SequencerFeeVault
    )
    const BobaFeeVaultBalanceAfter = await L2Boba.balanceOf(
      Boba_GasPriceOracle.address
    )
    const bobaBalanceDiff = BobaBalanceBefore.sub(BobaBalanceAfter)
    const bobaFeeReceived = BobaFeeVaultBalanceAfter.sub(
      BobaFeeVaultBalanceBefore
    )
    expect(bobaBalanceDiff).to.deep.equal(txBobaFee)
    // There is no inflation
    expect(bobaFeeReceived).to.deep.equal(bobaBalanceDiff)

    expect(ETHBalanceBefore).to.deep.equal(ETHBalanceAfter)
    expect(ETHFeeVaultBalanceBefore).to.deep.equal(ETHFeeVaultBalanceAfter)

    await setPrices(env, 1)
  })

  it('{tag:boba} should compute correct boba fee for transferring BOBA', async () => {
    await setPrices(env, 1000)

    const ETHBalanceBefore = await env.l2Wallet.getBalance()
    const BobaBalanceBefore = await L2Boba.balanceOf(env.l2Wallet.address)
    const ETHFeeVaultBalanceBefore = await env.l2Wallet.provider.getBalance(
      predeploys.OVM_SequencerFeeVault
    )
    const BobaFeeVaultBalanceBefore = await L2Boba.balanceOf(
      Boba_GasPriceOracle.address
    )

    const tx = await L2Boba.transfer(env.l2Wallet.address, 0)
    const receipt = await tx.wait()
    const priceRatio = await Boba_GasPriceOracle.priceRatio()
    const txBobaFee = receipt.gasUsed.mul(tx.gasPrice).mul(priceRatio)
    const ETHBalanceAfter = await env.l2Wallet.getBalance()
    const BobaBalanceAfter = await L2Boba.balanceOf(env.l2Wallet.address)
    const ETHFeeVaultBalanceAfter = await env.l2Wallet.provider.getBalance(
      predeploys.OVM_SequencerFeeVault
    )
    const BobaFeeVaultBalanceAfter = await L2Boba.balanceOf(
      Boba_GasPriceOracle.address
    )
    const bobaBalanceDiff = BobaBalanceBefore.sub(BobaBalanceAfter)
    const bobaFeeReceived = BobaFeeVaultBalanceAfter.sub(
      BobaFeeVaultBalanceBefore
    )
    expect(bobaBalanceDiff).to.deep.equal(txBobaFee)
    // There is no inflation
    expect(bobaFeeReceived).to.deep.equal(bobaBalanceDiff)

    expect(ETHBalanceBefore).to.deep.equal(ETHBalanceAfter)
    expect(ETHFeeVaultBalanceBefore).to.deep.equal(ETHFeeVaultBalanceAfter)

    await setPrices(env, 1)
  })

  it('{tag:boba} should compute correct fee with different gas limit for transferring ETH', async () => {
    await setPrices(env, 1000)

    const estimatedGas = await env.l2Wallet.estimateGas({
      to: env.l2Wallet.address,
      value: ethers.utils.parseEther('1'),
    })
    let gasLimit = estimatedGas.toNumber()

    while (gasLimit < estimatedGas.toNumber() + 1000) {
      const ETHBalanceBefore = await env.l2Wallet.getBalance()
      const BobaBalanceBefore = await L2Boba.balanceOf(env.l2Wallet.address)
      const ETHFeeVaultBalanceBefore = await env.l2Wallet.provider.getBalance(
        predeploys.OVM_SequencerFeeVault
      )
      const BobaFeeVaultBalanceBefore = await L2Boba.balanceOf(
        Boba_GasPriceOracle.address
      )
      const tx = await env.l2Wallet.sendTransaction({
        to: env.l2Wallet.address,
        value: ethers.utils.parseEther('1'),
        gasLimit,
      })
      const receipt = await tx.wait()
      const priceRatio = await Boba_GasPriceOracle.priceRatio()
      const txBobaFee = receipt.gasUsed.mul(tx.gasPrice).mul(priceRatio)
      const ETHBalanceAfter = await env.l2Wallet.getBalance()
      const BobaBalanceAfter = await L2Boba.balanceOf(env.l2Wallet.address)
      const ETHFeeVaultBalanceAfter = await env.l2Wallet.provider.getBalance(
        predeploys.OVM_SequencerFeeVault
      )
      const BobaFeeVaultBalanceAfter = await L2Boba.balanceOf(
        Boba_GasPriceOracle.address
      )
      const bobaBalanceDiff = BobaBalanceBefore.sub(BobaBalanceAfter)
      const bobaFeeReceived = BobaFeeVaultBalanceAfter.sub(
        BobaFeeVaultBalanceBefore
      )

      expect(bobaBalanceDiff).to.deep.equal(txBobaFee)
      // There is no inflation
      expect(bobaFeeReceived).to.deep.equal(bobaBalanceDiff)

      expect(ETHBalanceBefore).to.deep.equal(ETHBalanceAfter)
      expect(ETHFeeVaultBalanceBefore).to.deep.equal(ETHFeeVaultBalanceAfter)

      gasLimit += 100
    }

    await setPrices(env, 1)
  })

  it('{tag:boba} should compute correct fee with different gas limit for transferring Boba', async () => {
    await setPrices(env, 1000)

    const estimatedGas = await L2Boba.estimateGas.transfer(
      env.l2Wallet.address,
      ethers.utils.parseEther('1')
    )
    let gasLimit = estimatedGas.toNumber()

    while (gasLimit < estimatedGas.toNumber() + 1000) {
      const ETHBalanceBefore = await env.l2Wallet.getBalance()
      const BobaBalanceBefore = await L2Boba.balanceOf(env.l2Wallet.address)
      const ETHFeeVaultBalanceBefore = await env.l2Wallet.provider.getBalance(
        predeploys.OVM_SequencerFeeVault
      )
      const BobaFeeVaultBalanceBefore = await L2Boba.balanceOf(
        Boba_GasPriceOracle.address
      )
      const tx = await L2Boba.transfer(
        env.l2Wallet.address,
        ethers.utils.parseEther('1'),
        { gasLimit }
      )
      const receipt = await tx.wait()
      const priceRatio = await Boba_GasPriceOracle.priceRatio()
      const txBobaFee = receipt.gasUsed.mul(tx.gasPrice).mul(priceRatio)
      const ETHBalanceAfter = await env.l2Wallet.getBalance()
      const BobaBalanceAfter = await L2Boba.balanceOf(env.l2Wallet.address)
      const ETHFeeVaultBalanceAfter = await env.l2Wallet.provider.getBalance(
        predeploys.OVM_SequencerFeeVault
      )
      const BobaFeeVaultBalanceAfter = await L2Boba.balanceOf(
        Boba_GasPriceOracle.address
      )
      const bobaBalanceDiff = BobaBalanceBefore.sub(BobaBalanceAfter)
      const bobaFeeReceived = BobaFeeVaultBalanceAfter.sub(
        BobaFeeVaultBalanceBefore
      )

      expect(bobaBalanceDiff).to.deep.equal(txBobaFee)
      // There is no inflation
      expect(bobaFeeReceived).to.deep.equal(bobaBalanceDiff)

      expect(ETHBalanceBefore).to.deep.equal(ETHBalanceAfter)
      expect(ETHFeeVaultBalanceBefore).to.deep.equal(ETHFeeVaultBalanceAfter)

      gasLimit += 100
    }

    await setPrices(env, 1)
  })

  it('{tag:boba} should reject a transaction with a too low gas limit', async () => {
    const tx = {
      to: env.l2Wallet.address,
      value: ethers.utils.parseEther('1'),
      gasLimit: 1100000,
    }

    const gasLimit = await env.l2Wallet.estimateGas(tx)
    tx.gasLimit = gasLimit.toNumber() - 10

    await expect(env.l2Wallet.sendTransaction(tx)).to.be.rejectedWith(
      'invalid transaction: intrinsic gas too low'
    )
  })

  it('{tag:boba} should not be able to withdraw fees before the minimum is met', async () => {
    await expect(Boba_GasPriceOracle.withdraw()).to.be.rejected
  })

  it('{tag:boba} should be able to withdraw fees back to L1 once the minimum is met', async function () {
    const l1FeeWallet = await Boba_GasPriceOracle.l1FeeWallet()
    const balanceBefore = await L1Boba.balanceOf(l1FeeWallet)
    const withdrawalAmount = await Boba_GasPriceOracle.MIN_WITHDRAWAL_AMOUNT()

    const l2WalletBalance = await L2Boba.balanceOf(env.l2Wallet.address)
    if (l2WalletBalance.lt(withdrawalAmount)) {
      console.log(
        `NOTICE: must have at least ${ethers.utils.formatEther(
          withdrawalAmount
        )} BOBA on L2 to execute this test, skipping`
      )
      this.skip()
    }

    // Transfer the minimum required to withdraw.
    const tx = await L2Boba.transfer(
      Boba_GasPriceOracle.address,
      withdrawalAmount
    )
    await tx.wait()

    const vaultBalance = await L2Boba.balanceOf(Boba_GasPriceOracle.address)

    // Submit the withdrawal.
    const withdrawTx = await Boba_GasPriceOracle.withdraw({
      gasPrice: 0,
    })

    // Wait for the withdrawal to be relayed to L1.
    await withdrawTx.wait()
    await env.relayXDomainMessages(withdrawTx)
    await env.waitForXDomainTransaction(withdrawTx)

    // Balance difference should be equal to old L2 balance.
    const balanceAfter = await L1Boba.balanceOf(l1FeeWallet)
    expect(balanceAfter.sub(balanceBefore)).to.deep.equal(
      BigNumber.from(vaultBalance)
    )
  })

  // Boba Ethereum special fields on the receipt
  it('{tag:boba} includes L2 Boba fee', async () => {
    const l1Fee = await env.messenger.contracts.l2.OVM_GasPriceOracle.getL1Fee(
      '0x'
    )
    const l1GasPrice =
      await env.messenger.contracts.l2.OVM_GasPriceOracle.l1BaseFee()
    const l1GasUsed =
      await env.messenger.contracts.l2.OVM_GasPriceOracle.getL1GasUsed('0x')
    const scalar = await env.messenger.contracts.l2.OVM_GasPriceOracle.scalar()
    const decimals =
      await env.messenger.contracts.l2.OVM_GasPriceOracle.decimals()

    const scaled = scalar.toNumber() / 10 ** decimals.toNumber()

    const priceRatio = await Boba_GasPriceOracle.priceRatio()

    const tx = await env.l2Wallet.sendTransaction({
      to: env.l2Wallet.address,
      value: ethers.utils.parseEther('1'),
    })
    const receipt = await tx.wait()
    const txBobaFee = receipt.gasUsed.mul(tx.gasPrice).mul(priceRatio)
    const json = await env.l2Provider.send('eth_getTransactionReceipt', [
      tx.hash,
    ])
    expect(l1GasUsed).to.deep.equal(BigNumber.from(json.l1GasUsed))
    expect(l1GasPrice).to.deep.equal(BigNumber.from(json.l1GasPrice))
    expect(scaled.toString()).to.deep.equal(json.l1FeeScalar)
    expect(l1Fee).to.deep.equal(BigNumber.from(json.l1Fee))
    expect(json.l2BobaFee).to.deep.equal(txBobaFee)
  })

  // Boba Ethereum special fields on the receipt
  it('{tag:boba} includes L2 Boba fee with different gas price', async () => {
    const l1Fee = await env.messenger.contracts.l2.OVM_GasPriceOracle.getL1Fee(
      '0x'
    )
    const l1GasPrice =
      await env.messenger.contracts.l2.OVM_GasPriceOracle.l1BaseFee()
    const l1GasUsed =
      await env.messenger.contracts.l2.OVM_GasPriceOracle.getL1GasUsed('0x')
    const scalar = await env.messenger.contracts.l2.OVM_GasPriceOracle.scalar()
    const decimals =
      await env.messenger.contracts.l2.OVM_GasPriceOracle.decimals()

    const scaled = scalar.toNumber() / 10 ** decimals.toNumber()

    const priceRatio = await Boba_GasPriceOracle.priceRatio()

    let gasPrice = 1

    while (gasPrice < 10) {
      const tx = await env.l2Wallet.sendTransaction({
        to: env.l2Wallet.address,
        value: ethers.utils.parseEther('1'),
        gasPrice,
      })
      const receipt = await tx.wait()
      const txBobaFee = receipt.gasUsed.mul(tx.gasPrice).mul(priceRatio)
      const json = await env.l2Provider.send('eth_getTransactionReceipt', [
        tx.hash,
      ])
      expect(l1GasUsed).to.deep.equal(BigNumber.from(json.l1GasUsed))
      expect(l1GasPrice).to.deep.equal(BigNumber.from(json.l1GasPrice))
      expect(scaled.toString()).to.deep.equal(json.l1FeeScalar)
      expect(l1Fee).to.deep.equal(BigNumber.from(json.l1Fee))
      expect(json.l2BobaFee).to.deep.equal(txBobaFee)

      gasPrice += 1
    }
  })

  it('{tag:boba} should compute correct fee with different price ratio for transferring ETH', async () => {
    let priceRatio = 2000
    while (priceRatio < 3000) {
      const setPriceRatio = await Boba_GasPriceOracle.connect(
        env.l2Wallet_4
      ).updatePriceRatio(priceRatio)
      await setPriceRatio.wait()

      const ETHBalanceBefore = await env.l2Wallet.getBalance()
      const BobaBalanceBefore = await L2Boba.balanceOf(env.l2Wallet.address)
      const ETHFeeVaultBalanceBefore = await env.l2Wallet.provider.getBalance(
        predeploys.OVM_SequencerFeeVault
      )
      const BobaFeeVaultBalanceBefore = await L2Boba.balanceOf(
        Boba_GasPriceOracle.address
      )

      const tx = await env.l2Wallet.sendTransaction({
        to: env.l2Wallet.address,
        value: 0,
      })
      const receipt = await tx.wait()
      const txBobaFee = receipt.gasUsed.mul(tx.gasPrice).mul(priceRatio)
      const ETHBalanceAfter = await env.l2Wallet.getBalance()
      const BobaBalanceAfter = await L2Boba.balanceOf(env.l2Wallet.address)
      const ETHFeeVaultBalanceAfter = await env.l2Wallet.provider.getBalance(
        predeploys.OVM_SequencerFeeVault
      )
      const BobaFeeVaultBalanceAfter = await L2Boba.balanceOf(
        Boba_GasPriceOracle.address
      )
      const bobaBalanceDiff = BobaBalanceBefore.sub(BobaBalanceAfter)
      const bobaFeeReceived = BobaFeeVaultBalanceAfter.sub(
        BobaFeeVaultBalanceBefore
      )
      expect(bobaBalanceDiff).to.deep.equal(txBobaFee)
      // There is no inflation
      expect(bobaFeeReceived).to.deep.equal(bobaBalanceDiff)

      expect(ETHBalanceBefore).to.deep.equal(ETHBalanceAfter)
      expect(ETHFeeVaultBalanceBefore).to.deep.equal(ETHFeeVaultBalanceAfter)

      priceRatio += 100
    }
  })

  it('{tag:boba} should compute correct fee with different price ratio for transferring BOBA', async () => {
    let priceRatio = 2000
    while (priceRatio < 3000) {
      const setPriceRatio = await Boba_GasPriceOracle.connect(
        env.l2Wallet_4
      ).updatePriceRatio(priceRatio)
      await setPriceRatio.wait()

      const ETHBalanceBefore = await env.l2Wallet.getBalance()
      const BobaBalanceBefore = await L2Boba.balanceOf(env.l2Wallet.address)
      const ETHFeeVaultBalanceBefore = await env.l2Wallet.provider.getBalance(
        predeploys.OVM_SequencerFeeVault
      )
      const BobaFeeVaultBalanceBefore = await L2Boba.balanceOf(
        Boba_GasPriceOracle.address
      )

      const tx = await L2Boba.transfer(env.l2Wallet.address, 0)
      const receipt = await tx.wait()
      const txBobaFee = receipt.gasUsed.mul(tx.gasPrice).mul(priceRatio)
      const ETHBalanceAfter = await env.l2Wallet.getBalance()
      const BobaBalanceAfter = await L2Boba.balanceOf(env.l2Wallet.address)
      const ETHFeeVaultBalanceAfter = await env.l2Wallet.provider.getBalance(
        predeploys.OVM_SequencerFeeVault
      )
      const BobaFeeVaultBalanceAfter = await L2Boba.balanceOf(
        Boba_GasPriceOracle.address
      )
      const bobaBalanceDiff = BobaBalanceBefore.sub(BobaBalanceAfter)
      const bobaFeeReceived = BobaFeeVaultBalanceAfter.sub(
        BobaFeeVaultBalanceBefore
      )
      expect(bobaBalanceDiff).to.deep.equal(txBobaFee)
      // There is no inflation
      expect(bobaFeeReceived).to.deep.equal(bobaBalanceDiff)

      expect(ETHBalanceBefore).to.deep.equal(ETHBalanceAfter)
      expect(ETHFeeVaultBalanceBefore).to.deep.equal(ETHFeeVaultBalanceAfter)

      priceRatio += 100
    }
  })

  it('{tag:boba} should pay BOBA to deploy contracts', async () => {
    await setPrices(env, 1000)

    const ETHBalanceBefore = await env.l2Wallet.getBalance()
    const BobaBalanceBefore = await L2Boba.balanceOf(env.l2Wallet.address)
    const ETHFeeVaultBalanceBefore = await env.l2Wallet.provider.getBalance(
      predeploys.OVM_SequencerFeeVault
    )
    const BobaFeeVaultBalanceBefore = await L2Boba.balanceOf(
      Boba_GasPriceOracle.address
    )

    const TestContract = await Factory__Proxy__Boba_GasPriceOracle.deploy(
      Boba_GasPriceOracle.address
    )
    const receipt = await TestContract.deployTransaction.wait()
    const priceRatio = await Boba_GasPriceOracle.priceRatio()
    const txBobaFee = receipt.gasUsed.mul(BigNumber.from(1000)).mul(priceRatio)
    const ETHBalanceAfter = await env.l2Wallet.getBalance()
    const BobaBalanceAfter = await L2Boba.balanceOf(env.l2Wallet.address)
    const ETHFeeVaultBalanceAfter = await env.l2Wallet.provider.getBalance(
      predeploys.OVM_SequencerFeeVault
    )
    const BobaFeeVaultBalanceAfter = await L2Boba.balanceOf(
      Boba_GasPriceOracle.address
    )
    const bobaBalanceDiff = BobaBalanceBefore.sub(BobaBalanceAfter)
    const bobaFeeReceived = BobaFeeVaultBalanceAfter.sub(
      BobaFeeVaultBalanceBefore
    )
    expect(bobaBalanceDiff).to.deep.equal(txBobaFee)
    // There is no inflation
    expect(bobaFeeReceived).to.deep.equal(bobaBalanceDiff)

    expect(ETHBalanceBefore).to.deep.equal(ETHBalanceAfter)
    expect(ETHFeeVaultBalanceBefore).to.deep.equal(ETHFeeVaultBalanceAfter)

    await setPrices(env, 1)
  })

  it('{tag:boba} should pay BOBA to deploy contracts for different gas limit', async () => {
    await setPrices(env, 1000)

    const data = Factory__Proxy__Boba_GasPriceOracle.getDeployTransaction(
      Boba_GasPriceOracle.address
    )
    const estimatedGas = await env.l2Wallet.estimateGas(data)

    let gasLimit = estimatedGas.toNumber()
    while (gasLimit < estimatedGas.toNumber() + 10000) {
      const ETHBalanceBefore = await env.l2Wallet.getBalance()
      const BobaBalanceBefore = await L2Boba.balanceOf(env.l2Wallet.address)
      const ETHFeeVaultBalanceBefore = await env.l2Wallet.provider.getBalance(
        predeploys.OVM_SequencerFeeVault
      )
      const BobaFeeVaultBalanceBefore = await L2Boba.balanceOf(
        Boba_GasPriceOracle.address
      )

      const TestContract = await Factory__Proxy__Boba_GasPriceOracle.deploy(
        Boba_GasPriceOracle.address
      )
      const receipt = await TestContract.deployTransaction.wait()
      const priceRatio = await Boba_GasPriceOracle.priceRatio()
      const txBobaFee = receipt.gasUsed
        .mul(BigNumber.from(1000))
        .mul(priceRatio)
      const ETHBalanceAfter = await env.l2Wallet.getBalance()
      const BobaBalanceAfter = await L2Boba.balanceOf(env.l2Wallet.address)
      const ETHFeeVaultBalanceAfter = await env.l2Wallet.provider.getBalance(
        predeploys.OVM_SequencerFeeVault
      )
      const BobaFeeVaultBalanceAfter = await L2Boba.balanceOf(
        Boba_GasPriceOracle.address
      )
      const bobaBalanceDiff = BobaBalanceBefore.sub(BobaBalanceAfter)
      const bobaFeeReceived = BobaFeeVaultBalanceAfter.sub(
        BobaFeeVaultBalanceBefore
      )
      expect(bobaBalanceDiff).to.deep.equal(txBobaFee)
      // There is no inflation
      expect(bobaFeeReceived).to.deep.equal(bobaBalanceDiff)

      expect(ETHBalanceBefore).to.deep.equal(ETHBalanceAfter)
      expect(ETHFeeVaultBalanceBefore).to.deep.equal(ETHFeeVaultBalanceAfter)

      gasLimit += 1000
    }

    await setPrices(env, 1)
  })

  it('{tag:boba} should register to use ETH as the fee token', async () => {
    // Register l1wallet for using ETH as the fee token
    const registerTx = await Boba_GasPriceOracle.useETHAsFeeToken()
    await registerTx.wait()

    expect(
      await Boba_GasPriceOracle.bobaFeeTokenUsers(env.l2Wallet.address)
    ).to.be.deep.eq(false)
  })

  it('{tag:boba} should pay boba fee with 0 ETH in the wallet', async () => {
    const wallet = ethers.Wallet.createRandom().connect(env.l2Provider)

    const fundTx = await env.l2Wallet.sendTransaction({
      to: wallet.address,
      value: ethers.utils.parseEther('1'),
    })
    await fundTx.wait()

    // Register the fee token
    const registerTx = await Boba_GasPriceOracle.connect(
      wallet
    ).useBobaAsFeeToken()
    await registerTx.wait()

    // Transfer Boba token
    // The l2 gas price and l1 base price should be calculated carefully.
    // If we go with the l2GasPrice=1GWEI, the minimum Boba amount for using
    // the Boba as the fee token is around 11 Boba. This is caused by how the
    // gas limit is estimated. In api.go, it estimates the gas from the middle
    // of the block gas limit and uses the binary search to find the good gas limit.
    // The Boba for the block.GasLimit / 2 is gasLimit * gasPrice * priceRatio =
    // 11_000_000 / 2 * 10^9 * 2000 / 10^18 = 11 BOBA.
    // The ideal l2 gas price should be 0.1 GWEI, so the minimum Boba for users
    // to use the Boba as the fee token is 1.1 BOBA
    const addBobaTx = await L2Boba.connect(env.l2Wallet).transfer(
      wallet.address,
      ethers.utils.parseEther('200')
    )
    await addBobaTx.wait()

    // Transfer all eth to the original owner
    const ETHBalance = await wallet.getBalance()
    const dropETHTx = await wallet.sendTransaction({
      to: env.l2Wallet.address,
      value: ETHBalance,
    })
    await dropETHTx.wait()

    const ETHBalanceAfter = await wallet.getBalance()

    expect(ETHBalanceAfter).to.deep.eq(BigNumber.from('0'))
  })

  it("{tag:boba} should revert tx if users don't have enough Boba", async () => {
    const wallet = ethers.Wallet.createRandom().connect(env.l2Provider)

    const fundTx = await env.l2Wallet.sendTransaction({
      to: wallet.address,
      value: ethers.utils.parseEther('1'),
    })
    await fundTx.wait()

    // Register the fee token
    const registerTx = await Boba_GasPriceOracle.connect(
      wallet
    ).useBobaAsFeeToken()
    await registerTx.wait()

    await expect(
      wallet.sendTransaction({
        to: env.l2Wallet.address,
        value: ethers.utils.parseEther('0.5'),
      })
    ).to.be.rejectedWith('insufficient boba balance to pay for gas')
  })
})
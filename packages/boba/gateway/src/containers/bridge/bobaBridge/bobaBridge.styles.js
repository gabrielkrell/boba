import styled from '@emotion/styled';
import { Box, Button, Divider as MuiDivider, Typography } from "@mui/material";

export const BobaBridgeWrapper = styled(Box)(({ theme, width }) => ({
  background: theme.palette.background.secondary,
  backdropFilter: 'blur(100px)',
  borderRadius: '20px',
  width: width || '50%',
  flex: 1,
  minHeight: 'fit-content',
  padding: '20px'
}));


export const BobaContentWrapper = styled(Box)(({ theme, flexDirection }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  flexDirection: flexDirection || 'column',
}));


export const Divider = styled(MuiDivider)(({ theme }) => ({
  background: `${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(3, 19, 19, 0.04)'}`,
  boxSizing: 'border-box',
  boxShadow: `${theme.palette.mode === 'dark' ? '0px 4px 4px rgba(0, 0, 0, 0.25)' : 'none'}`,
  width: '100%'
}))


export const ChainInput = styled(Box)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  boxSizing: 'border-box',
  borderRadius: '12px',
  height: '50px',
  padding: '5px 10px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '10px',
  minWidth: '180px'
}))

export const ChainLabel = styled(Typography)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '10px',
}))

export const ChainSwitcherIcon = styled(Button)(({ theme }) => ({
  margin: '20px 0px',
  width: 'fit-content',
  alignSelf: 'center'
}))


export const HistoryLink = styled(Box)(({ theme, width }) => ({
  background: theme.palette.background.secondary,
  borderRadius: '20px',
  width: '100%',
  padding: '10px',
  '&:hover > span': {
    color: theme.palette.secondary.main
  }
}));

export const LayerAlert = styled(Box)(({ theme }) => ({
  width: "100%",
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '30px',
  borderRadius: '8px',
  margin: '20px 0px',
  padding: '25px',
  [theme.breakpoints.up('md')]: {
    padding: '25px 50px',
  },

}));

export const AlertText = styled(Typography)(({ theme }) => ({
  marginLeft: '10px',
  flex: 4,
  [theme.breakpoints.up('md')]: {
  },
}));

export const AlertInfo = styled(Box)`
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex: 1;
`;
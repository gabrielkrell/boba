import { Box, styled, TextField } from '@mui/material';

export const TokenInputWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  width: '100%',
  flexDirection: 'column',
  gap: '5px',
  justifyContent: 'flex-start'
}))

export const TokenPicker = styled(Box)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  borderRadius: '12px',
  height: '50px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '2px',
  padding: '5px 10px',
  width: '30%',
  cursor: 'pointer',
  'img': {
    marginRight: '5px'
  }
}));

export const TextFieldWrapper = styled(Box)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  borderRadius: '12px',
  height: '50px',
  width: '70%',
  display: 'flex',
  justifyContent: 'flex-start',
  alignItems: 'center',
}))

export const TextFieldTag = styled(TextField)(({ ...props }) => ({
  border: 'none',
  padding: '0 10px',
  height: '100%',
  "input::-webkit-outer-spin-button, input::-webkit-inner-spin-button": {
    "WebkitAppearance": "none",
    "margin": 0,
  },
  "input[type=number]": {
    "MozAppearance": "textfield",
    height: '40px',
  },
  '& .MuiInputBase-input': {
    fontSize: '0.9em',
  },
  '& .MuiInputBase-root': {
    '&:before': {
      border: 'none !important'
    },
    '&:hover': {
      border: 'none !important'
    },
    '&:after': {
      border: 'none !important'
    }
  },
  '&:hover': {
    borderRadius: 4,
    backgroundColor: props.theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255,255,255,0.05)',
  }
}));


export const TokenPickerAction = styled(Box)(({ theme }) => ({
  display: 'flex',
  width: '20%',
  'button' : {
    '&:hover': {
      'svg': {
        color: theme.palette.secondary.main
      }
    }
  }
}));
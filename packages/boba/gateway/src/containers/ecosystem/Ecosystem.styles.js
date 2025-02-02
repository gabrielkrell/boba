import { Box, Divider, Grid, IconButton, Typography } from '@mui/material';
import Card from '@mui/material/Card';
import { styled } from '@mui/material/styles';

export const EcoSystemPageContainer = styled(Box)(({ theme }) => ({
  margin: '0px auto',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-around',
  padding: '10px',
  paddingTop: '0px',
  width: '70%',
  [ theme.breakpoints.between('md', 'lg') ]: {
    width: '90%',
    padding: '0px',
  },
  [ theme.breakpoints.between('sm', 'md') ]: {
    width: '90%',
    padding: '0px',
  },
  [ theme.breakpoints.down('sm') ]: {
    width: '100%',
    padding: '0px',
  },
}))

export const TileCard = styled(Card)(({ theme, ...props }) => ({
  borderRadius: '5px',
  height: '150px',
  width: '150px',
  padding: '5px',
  backgroundColor: theme.palette.background.secondary,
  justifyContent: 'space-between',
  //maxWidth: '90%',
  display: 'flex',
  alignItems: 'center',
  flexDirection: 'column',
  margin: '10px 0',
  border: 'solid rgba(255, 255, 255, 0.27)',
  borderWidth: '1px',
}))

export const TileHeader = styled(Box)(({ theme, ...props }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-evenly',
  alignItems: 'center',
}))

export const ImageContainer = styled(Box)(({ theme, ...props }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  width: '70px',
  height: '70px',
  borderRadius: '50%',
  position: 'absolute',
  margin: 'auto',
  top: '15px',
  background:  theme.palette.mode === 'light' ? '#c7c3c3' : '#272B30',
  'img': {
    width: '50px',
    maxHeight: '60px',
    padding: '2px'
  }
}))

export const TileFooter = styled(Box)(({ theme, ...props }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  overflow: 'hidden',
  borderBottomLeftRadius: '12px',
  borderBottomRightRadius: '12px',
  background: theme.palette.background.secondary,
  justifyContent: 'space-around',
  padding: '1rem',
  gap: 1,
  width: '100%'
}))

export const DividerLine = styled(Divider)(({ theme }) => ({
  background: `${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(3, 19, 19, 0.04)'}`,
  boxSizing: 'border-box',
  boxShadow: `${theme.palette.mode === 'dark' ? '0px 4px 4px rgba(0, 0, 0, 0.25)' : 'none'}`,
  width: '100%'
}))

export const CategoryList = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-start',
  gap: '10px',
  alignItems: 'center',
  margin: '10px',
  [ theme.breakpoints.down('sm') ]: {
    overflowX: 'scroll'
  },
}))


export const ProjectListContainer = styled(Grid)(({ theme }) => ({
  margin: "20px 10px !important",
  gap: '10px'
}))

export const ProjectListItem = styled(Grid)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start'
}))

export const ProjectContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100%',
  height: '100%',
}))

export const ProjectContent = styled(Box)(({ theme }) => ({
  borderTopLeftRadius: '12px',
  borderTopRightRadius: '12px',
  background: theme.palette.background.secondary, //'rgba(255, 255, 255, 0.06)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  alignItems: 'center',
  padding: '10px',
  paddingTop: '50px',
  gap: 1,
  marginTop: '50px',
  width: '100%',
  height: '-webkit-fill-available'
}))


export const ProjectDescription = styled(Typography)(({ theme }) => ({
  width: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  opacity: 0.85,
  fontWeight: 400,
  display: '-webkit-box',
  'WebkitLineClamp': 3,
  'WebkitBoxOrient': 'vertical'
}))




export const footerLink = styled(IconButton)(({ theme }) => ({
  '&:hover ': {
    svg: {
      path: {
        fill: theme.palette.primary.main,
        fillOpacity: 1,
      }
    }
  }
}))

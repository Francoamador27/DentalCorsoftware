import React, { useState } from 'react';
import { Fab, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import { HelpCircle, Layout, MonitorPlay } from 'lucide-react';
import { useTour } from '../tours/TourContext';

const HelpTourButton = () => {
  const { currentPageTour, replaySidebarTour, replayCurrentPageTour } = useTour();
  const [anchorEl, setAnchorEl] = useState(null);

  const open = Boolean(anchorEl);
  const close = () => setAnchorEl(null);

  return (
    <>
      <Tooltip title="Ayuda / recorrido guiado" placement="left">
        <Fab
          data-tour="help-tour-button"
          size="medium"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            bgcolor: '#008DD2',
            color: '#fff',
            zIndex: 1300,
            '&:hover': { bgcolor: '#0077b8' },
          }}
        >
          <HelpCircle size={22} />
        </Fab>
      </Tooltip>

      <Menu anchorEl={anchorEl} open={open} onClose={close} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <MenuItem
          onClick={() => {
            close();
            replaySidebarTour();
          }}
        >
          <ListItemIcon><Layout size={18} /></ListItemIcon>
          <ListItemText>Recorrer el menú</ListItemText>
        </MenuItem>

        <MenuItem
          disabled={!currentPageTour}
          onClick={() => {
            close();
            replayCurrentPageTour();
          }}
        >
          <ListItemIcon><MonitorPlay size={18} /></ListItemIcon>
          <ListItemText>Explicar esta pantalla</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default HelpTourButton;

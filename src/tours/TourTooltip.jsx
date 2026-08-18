import React from 'react';
import { Box, Typography, Button, IconButton } from '@mui/material';
import { X } from 'lucide-react';

const BRAND = '#008DD2';

// Tooltip 100% custom (render prop de react-joyride) para que el tour tenga
// look & feel de la marca en vez del estilo default de la librería.
const TourTooltip = ({
  index,
  size,
  isLastStep,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
}) => (
  <Box
    {...tooltipProps}
    sx={{
      maxWidth: 360,
      borderRadius: 3,
      overflow: 'hidden',
      boxShadow: '0 16px 40px rgba(0,0,0,0.28)',
      bgcolor: 'background.paper',
    }}
  >
    <Box sx={{ height: 4, bgcolor: 'rgba(0,141,210,0.15)' }}>
      <Box
        sx={{
          height: '100%',
          width: `${((index + 1) / size) * 100}%`,
          bgcolor: BRAND,
          transition: 'width .25s ease',
        }}
      />
    </Box>

    <Box sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          {step.title && (
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#0b3a52' }}>
              {step.title}
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Paso {index + 1} de {size}
          </Typography>
        </Box>
        <IconButton size="small" {...closeProps} sx={{ mt: -0.5, mr: -0.5 }}>
          <X size={16} />
        </IconButton>
      </Box>

      <Typography variant="body2" sx={{ color: 'text.primary', mb: 2.5 }}>
        {step.content}
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          {...skipProps}
          size="small"
          sx={{ color: 'text.secondary', textTransform: 'none' }}
        >
          Saltar tour
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {index > 0 && (
            <Button
              {...backProps}
              size="small"
              variant="outlined"
              sx={{ textTransform: 'none', borderColor: BRAND, color: BRAND }}
            >
              Atrás
            </Button>
          )}
          <Button
            {...primaryProps}
            size="small"
            variant="contained"
            sx={{ textTransform: 'none', bgcolor: BRAND, boxShadow: 'none', '&:hover': { bgcolor: '#0077b8' } }}
          >
            {isLastStep ? 'Finalizar' : 'Siguiente'}
          </Button>
        </Box>
      </Box>
    </Box>
  </Box>
);

export default TourTooltip;

import RefreshIcon from '@mui/icons-material/Refresh'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { JSX } from 'react'

import { useHealth } from '../api/useHealth.js'

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

export function HealthPanel(): JSX.Element {
  const { state, refresh } = useHealth()

  return (
    <Card>
      <CardContent>
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
        >
          <Typography variant="h2" component="h2">
            Service health
          </Typography>
          <Button
            onClick={refresh}
            startIcon={<RefreshIcon />}
            size="small"
            disabled={state.kind === 'loading'}
          >
            Refresh
          </Button>
        </Stack>

        {state.kind === 'loading' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CircularProgress size={18} />
            <Typography color="text.secondary">Checking /health…</Typography>
          </Box>
        )}

        {state.kind === 'error' && (
          <Alert severity="error" variant="outlined">
            {state.message}
          </Alert>
        )}

        {state.kind === 'ready' && (
          <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
            <Chip
              label={state.data.status}
              color="success"
              size="small"
              variant="outlined"
            />
            <Typography variant="body2" color="text.secondary">
              Last checked at {timeFormat.format(state.checkedAt)}
            </Typography>
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}

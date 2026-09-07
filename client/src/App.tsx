import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import type { JSX } from 'react'

import { HealthPanel } from './components/HealthPanel.js'
import { ServiceLinks } from './components/ServiceLinks.js'
import { ThemeModeToggle } from './components/ThemeModeToggle.js'

export function App(): JSX.Element {
  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <AppBar
        position="sticky"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar>
          <Typography variant="h1" component="h1" sx={{ flexGrow: 1 }}>
            Membrane
          </Typography>
          <ThemeModeToggle />
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          REST and MCP service built with Fastify, Zod, Kysely, and PGlite.
        </Typography>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <HealthPanel />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <ServiceLinks />
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}

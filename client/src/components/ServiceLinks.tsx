import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Link from '@mui/material/Link'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import type { JSX } from 'react'

interface ServiceLink {
  href: string
  label: string
  description: string
}

const links: readonly ServiceLink[] = [
  {
    href: '/docs',
    label: 'Swagger UI',
    description: 'Browse and exercise the REST API',
  },
  {
    href: '/docs/json',
    label: 'OpenAPI 3.1 document',
    description: 'Generated from the Zod route schemas',
  },
  {
    href: '/health',
    label: 'GET /health',
    description: 'Raw health response',
  },
]

export function ServiceLinks(): JSX.Element {
  return (
    <Card>
      <CardContent>
        <Typography variant="h2" component="h2" sx={{ mb: 1 }}>
          Endpoints
        </Typography>
        <List dense disablePadding>
          {links.map((link) => (
            <ListItem key={link.href} disableGutters>
              <ListItemText
                primary={
                  <Link
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    underline="hover"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                  >
                    {link.label}
                    <OpenInNewIcon sx={{ fontSize: 14 }} />
                  </Link>
                }
                secondary={link.description}
              />
            </ListItem>
          ))}
        </List>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          The MCP Streamable HTTP endpoint at <code>/mcp</code> speaks the MCP
          protocol and is intentionally absent from the OpenAPI document.
        </Typography>
      </CardContent>
    </Card>
  )
}

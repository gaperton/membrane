import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import SettingsBrightnessOutlinedIcon from '@mui/icons-material/SettingsBrightnessOutlined'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { useColorScheme } from '@mui/material/styles'
import type { JSX } from 'react'

const modes = ['system', 'light', 'dark'] as const

type Mode = (typeof modes)[number]

const icons: Record<Mode, JSX.Element> = {
  system: <SettingsBrightnessOutlinedIcon fontSize="small" />,
  light: <LightModeOutlinedIcon fontSize="small" />,
  dark: <DarkModeOutlinedIcon fontSize="small" />,
}

const labels: Record<Mode, string> = {
  system: 'Match system appearance',
  light: 'Light appearance',
  dark: 'Dark appearance',
}

export function ThemeModeToggle(): JSX.Element | null {
  const { mode, setMode } = useColorScheme()

  // Undefined until the provider has resolved the stored preference.
  if (mode === undefined) {
    return null
  }

  const next = modes[(modes.indexOf(mode) + 1) % modes.length] ?? 'system'

  return (
    <Tooltip title={labels[mode]}>
      <IconButton
        aria-label={labels[mode]}
        onClick={() => {
          setMode(next)
        }}
        size="small"
      >
        {icons[mode]}
      </IconButton>
    </Tooltip>
  )
}

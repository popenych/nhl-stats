import { useEffect } from 'react'
import { AppShell, Burger, Group, Button, Text, NavLink, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconCalendar,
  IconHome,
  IconLogout,
  IconMapPin,
  IconShirtSport,
  IconTrophy,
  IconUsers,
  IconUserCog,
} from '@tabler/icons-react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'

import { useAuth } from '../auth/auth-context-value'

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [navOpened, { toggle: toggleNav, close: closeNav }] = useDisclosure()

  // Close the mobile nav drawer whenever the route changes (e.g. after
  // tapping a nav link) instead of leaving it open over the new page.
  useEffect(() => {
    closeNav()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on navigation
  }, [location.pathname])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 200, breakpoint: 'sm', collapsed: { mobile: !navOpened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={navOpened} onClick={toggleNav} hiddenFrom="sm" size="sm" />
            <Title order={4}>NHL Stats Tracker</Title>
          </Group>
          <Group>
            <Text size="sm" visibleFrom="xs">
              {user?.player.name}
            </Text>
            <Button
              variant="subtle"
              size="xs"
              onClick={handleLogout}
              leftSection={<IconLogout size={16} />}
            >
              Log out
            </Button>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <NavLink
          component={Link}
          to="/"
          label="Home"
          leftSection={<IconHome size={18} />}
          active={location.pathname === '/'}
        />
        <NavLink
          component={Link}
          to="/games"
          label="Games"
          leftSection={<IconTrophy size={18} />}
          active={location.pathname.startsWith('/games')}
        />
        <NavLink
          component={Link}
          to="/teams"
          label="Teams"
          leftSection={<IconShirtSport size={18} />}
          active={location.pathname.startsWith('/teams')}
        />
        <NavLink
          component={Link}
          to="/players"
          label="Players"
          leftSection={<IconUsers size={18} />}
          active={location.pathname.startsWith('/players')}
        />
        <NavLink
          component={Link}
          to="/places"
          label="Places"
          leftSection={<IconMapPin size={18} />}
          active={location.pathname.startsWith('/places')}
        />
        <NavLink
          component={Link}
          to="/seasons"
          label="Seasons"
          leftSection={<IconCalendar size={18} />}
          active={location.pathname.startsWith('/seasons')}
        />
        {user?.role === 'admin' && (
          <NavLink
            component={Link}
            to="/admin/users"
            label="Manage users"
            leftSection={<IconUserCog size={18} />}
            active={location.pathname === '/admin/users'}
          />
        )}
      </AppShell.Navbar>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}

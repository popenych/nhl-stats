import { useEffect } from 'react'
import { AppShell, Burger, Group, Menu, Text, NavLink, Title, UnstyledButton } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconCalendar,
  IconChevronDown,
  IconHome,
  IconKey,
  IconLogout,
  IconMapPin,
  IconShirtSport,
  IconTrophy,
  IconUsers,
  IconUserCog,
} from '@tabler/icons-react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'

import { useAuth } from '../auth/auth-context-value'
import { ChangePasswordModal } from './ChangePasswordModal'

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [navOpened, { toggle: toggleNav, close: closeNav }] = useDisclosure()
  const [passwordModalOpened, { open: openPasswordModal, close: closePasswordModal }] =
    useDisclosure()

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
          <Menu position="bottom-end" withArrow>
            <Menu.Target>
              <UnstyledButton>
                <Group gap={4}>
                  <Text size="sm" visibleFrom="xs">
                    {user?.player.name}
                  </Text>
                  <IconChevronDown size={14} />
                </Group>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconKey size={14} />} onClick={openPasswordModal}>
                Change password
              </Menu.Item>
              <Menu.Item leftSection={<IconLogout size={14} />} onClick={handleLogout} color="red">
                Log out
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
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
      <ChangePasswordModal opened={passwordModalOpened} onClose={closePasswordModal} />
    </AppShell>
  )
}

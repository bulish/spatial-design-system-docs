import { SidebarLink } from "../types/sidebar-types";
import * as ROUTES from '../constants/routes'

export const sidebarData: SidebarLink[] = [
  {
    text: 'Editor',
    route: ROUTES.EDITOR,
    icon: 'code'
  },
  {
    text: 'Settings',
    route: ROUTES.SETTINGS,
    icon: 'cog'
  },
  {
    text: 'Docs',
    route: ROUTES.DOCS,
    icon: 'book'
  },
  {
    text: 'Course',
    route: ROUTES.COURSE,
    icon: 'box'
  },
  {
    text: 'Account',
    route: ROUTES.ACCOUNT,
    icon: 'user'
  }
]

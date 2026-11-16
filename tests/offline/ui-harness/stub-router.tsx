import { createElement as h } from 'react';
export const Link = ({ to, children, ...p }: any) => h('a', { href: '#' + to, ...p }, children);
export const NavLink = Link;
export const useParams = () => ({});
export const useNavigate = () => () => {};
export const useLocation = () => ({ pathname: '/' });
export const Navigate = () => null;

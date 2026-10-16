// Private area — never shown in Google search results.
export const metadata = { robots: { index: false, follow: false } };

export default function PrivateLayout({ children }) {
  return children;
}

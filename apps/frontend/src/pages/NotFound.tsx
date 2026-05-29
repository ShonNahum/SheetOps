import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
      <h1 className="text-6xl font-bold text-indigo-600 mb-4">404</h1>
      <p className="text-2xl font-semibold mb-6">Page Not Found</p>
      <Link to="/" className="text-indigo-600 hover:underline">
        Go back home
      </Link>
    </div>
  );
}

import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <h1 className="text-3xl font-semibold mb-2">Member Login</h1>
      <p className="text-gray-600 mb-8">
        Enter your email to receive a magic login link.
      </p>
      <LoginForm />
    </main>
  );
}

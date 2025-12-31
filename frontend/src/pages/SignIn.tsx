import { SignIn, useAuth } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';

function SignInPage() {
  const { isLoaded, isSignedIn } = useAuth();

  // If already signed in, redirect to home
  if (isLoaded && isSignedIn) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/"
            forceRedirectUrl="/"
            appearance={{
              elements: {
                rootBox: "mx-auto w-full",
                card: "mx-auto w-full",
                cardBox: "mx-auto w-full"
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default SignInPage;

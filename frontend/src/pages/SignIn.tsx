import { SignIn } from '@clerk/clerk-react';

function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
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

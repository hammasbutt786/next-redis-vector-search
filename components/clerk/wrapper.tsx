import React from "react";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { dark } from "@clerk/ui/themes";

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkProvider
      appearance={{ theme: dark }}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      <header
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          padding: "1rem",
          gap: "1rem",
          height: "4rem",
        }}
      >
        <Show when="signed-out">
          <SignInButton />
          <SignUpButton />
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </header>
      {children}
    </ClerkProvider>
  );
};

export default Wrapper;

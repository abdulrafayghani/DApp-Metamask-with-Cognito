import React from "react";
import { AuthProvider } from '../context/AuthProvider';
import { AwsProvider } from '../context/AwsProvider';

// const stripePromise = loadStripe(process.env.GATSBY_STRIPE_PUBLIC_KEY);

export const wrapRootElement = ({ element }) => {
    return (
        <AuthProvider>
            <AwsProvider>
                {element}
            </AwsProvider>
        </AuthProvider>
    )
}
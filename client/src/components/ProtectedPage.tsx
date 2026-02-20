import { ComponentType } from "react";
import { ProtectedRoute } from "./ProtectedRoute";

/**
 * Higher-order component to wrap pages with authentication protection
 */
export function withProtectedRoute<P extends object>(
  Component: ComponentType<P>
): ComponentType<P> {
  return function ProtectedPage(props: P) {
    return (
      <ProtectedRoute>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

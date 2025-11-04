import { ErrorPage } from "./ErrorPage";

export function NotFoundPage() {
  return <ErrorPage statusCode={404} message="Page Not Found" />;
}

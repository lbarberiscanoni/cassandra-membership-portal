/* src/app/membership/page.jsx */
import { Suspense } from "react";
import Wizard from "./Wizard";

export const metadata = {
  title: "Cassandra Membership Sign-up",
};

export default function MembershipPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading wizard…</p>}>
      <Wizard />
    </Suspense>
  );
}

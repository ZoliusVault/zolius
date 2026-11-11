import { redirect } from "next/navigation";

export default function PrivateAssetsAliasPage() {
  redirect("/app?tab=assets");
}

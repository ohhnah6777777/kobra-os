import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { KobraOS } from "@/os/OS";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "kobra os" },
      { name: "description", content: "kobra os — a dark glass operating system that runs entirely in your browser, with games, chat, an AI assistant and more." },
      { property: "og:title", content: "kobra os" },
      { property: "og:description", content: "A dark glass operating system that runs in your browser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <ClientOnly fallback={<div className="fixed inset-0 bg-blackout" />}>
      <KobraOS />
    </ClientOnly>
  );
}

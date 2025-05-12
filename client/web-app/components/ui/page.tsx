import Header from "@/components/modules/header";
type PageProps = {
  children: React.ReactNode;
}

export default function Page({ children }: PageProps) {
  return (
    <div className="flex min-h-screen max-w-6xl mx-auto flex-col">
      <Header />
      {children}
    </div>
  )
}

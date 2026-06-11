import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { MEMBERS } from "@/lib/members"
import NavBar from "@/components/NavBar"
import MemberCard from "@/components/MemberCard"

export default async function DashboardPage() {
  const session = await auth()

  // Fetch Google profile images for members who have signed in
  const users = await prisma.user.findMany({
    where: { memberName: { not: null } },
    select: { memberName: true, image: true },
  })
  const imageMap = Object.fromEntries(users.map((u) => [u.memberName!, u.image]))

  return (
    <>
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-slate-900">Team</h1>
          <p className="text-sm text-slate-500 mt-1">
            Select a member to view their profile or leave feedback
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {MEMBERS.map((member) => (
            <MemberCard
              key={member.name}
              name={member.name}
              image={imageMap[member.name] ?? null}
              isCurrentUser={session?.user?.memberName === member.name}
            />
          ))}
        </div>
      </main>
    </>
  )
}

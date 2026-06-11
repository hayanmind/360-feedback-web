import Link from "next/link"
import Image from "next/image"

type Props = {
  name: string
  image?: string | null
  isCurrentUser?: boolean
}

export default function MemberCard({ name, image, isCurrentUser }: Props) {
  return (
    <Link
      href={`/members/${name}`}
      className="group bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center gap-3 hover:border-slate-300 hover:shadow-sm transition-all"
    >
      <div className="relative">
        {image ? (
          <Image
            src={image}
            alt={name}
            width={64}
            height={64}
            className="rounded-full"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
            <span className="text-2xl font-semibold text-slate-400">{name[0]}</span>
          </div>
        )}
        {isCurrentUser && (
          <span className="absolute -bottom-1 -right-1 bg-indigo-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none">
            You
          </span>
        )}
      </div>
      <div className="text-center">
        <p className="font-medium text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
          {name}
        </p>
      </div>
    </Link>
  )
}

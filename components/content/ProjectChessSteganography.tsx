import Image from "next/image";
import Link from "next/link";

export default function ProjectChessSteganography() {
  return (
    <div className="prose prose-invert max-w-none">
      <h3 className="font-retroSans font-extrabold text-accent text-4xl md:text-5xl">
        Chess Steganography
      </h3>

      <div className="my-2 overflow-hidden rounded-lg ring-1 ring-ring/50 max-w-[350px] mx-auto">
        <Link
          href="https://github.com/linuxer77/chessStorj"
          target="_blank"
        >
          <Image
            src="/projects/chess-steganography.png"
            alt="Chess Steganography"
            width={350}
            height={233}
            className="h-auto w-full"
            priority
          />
        </Link>
      </div>

      <p>
        <Link
          href="https://github.com/linuxer77/chessStorj"
          target="_blank"
          className="text-accent underline underline-offset-4 hover:text-accent2"
        >
          GitHub Repo
        </Link>
      </p>
      <p>
        Encodes an image into chess games by converting the image to binary and
        mapping each bit to the color of the destination square of a move (white
        = 0, black = 1). Two Lichess bots play games to sequentially store the
        bits in PGN files, which are later decoded to reconstruct the original
        image.
      </p>

    </div>
  );
}

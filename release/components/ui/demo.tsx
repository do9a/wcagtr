import { DottedSurface } from '@/components/ui/dotted-surface';
import { cn } from '@/lib/utils';

export default function DemoOne() {
  return (
    <DottedSurface className="size-full">
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute -top-10 left-1/2 size-full -translate-x-1/2 rounded-full',
            'bg-[radial-gradient(ellipse_at_center,rgba(120,120,120,0.25),transparent_60%)]',
            'blur-[30px]',
          )}
        />
        <h2 className="font-mono text-3xl font-semibold md:text-4xl">
          Dotted Surface
        </h2>
      </div>
    </DottedSurface>
  );
}

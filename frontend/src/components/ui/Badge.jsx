import { cva } from 'class-variance-authority';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const badgeVariants = cva(
    'inline-flex items-center rounded-none px-2.5 py-0.5 text-xs font-semibold shadow-[var(--pixel-box-shadow)] box-shadow-margin border-none transition-colors',
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground',
                secondary: 'bg-secondary text-secondary-foreground',
                destructive: 'bg-destructive text-white',
                outline: 'bg-background text-foreground',
                success: 'bg-[var(--success)] text-[var(--success-foreground)]',
                warning: 'bg-[var(--warning)] text-[var(--warning-foreground)]',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

function Badge({ className, variant, children, ...props }) {
    return (
        <span className={cn(badgeVariants({ variant }), 'pixel-font', className)} {...props}>
            {children}
        </span>
    );
}

export { Badge, badgeVariants };

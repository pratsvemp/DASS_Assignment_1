import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';

// Merge class names
const cn = (...classes) => classes.filter(Boolean).join(' ');

const pixelButtonVariants = cva(
    'pixel__button pixel-font cursor-pointer rounded-none inline-flex items-center justify-center whitespace-nowrap text-sm transition-all duration-100 disabled:opacity-50 disabled:pointer-events-none',
    {
        variants: {
            variant: {
                default: 'pixel-default__button box-shadow-margin bg-white text-black',
                secondary: 'pixel-secondary__button box-shadow-margin',
                warning: 'pixel-warning__button box-shadow-margin',
                success: 'pixel-success__button box-shadow-margin',
                destructive: 'pixel-destructive__button box-shadow-margin',
                outline: 'pixel-default__button box-shadow-margin bg-background text-foreground',
                ghost: 'hover:bg-muted text-foreground',
            },
            size: {
                default: 'h-10 px-4 py-2',
                sm: 'h-9 px-3 text-xs',
                lg: 'h-11 px-8 text-base',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

const Button = forwardRef(({ className, variant, size, children, ...props }, ref) => {
    return (
        <button
            ref={ref}
            className={cn(pixelButtonVariants({ variant, size }), className)}
            {...props}
        >
            {children}
        </button>
    );
});
Button.displayName = 'PixelButton';

export { Button, pixelButtonVariants };

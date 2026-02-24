import { forwardRef } from 'react';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const Input = forwardRef(({ className, disabled, ...props }, ref) => {
    return (
        <input
            ref={ref}
            disabled={disabled}
            className={cn(
                'pixel__input pixel-font w-full max-w-full outline-none p-2 bg-background text-foreground box-shadow-margin placeholder:text-muted-foreground placeholder:text-xs',
                disabled && 'opacity-40 cursor-not-allowed',
                className
            )}
            {...props}
        />
    );
});
Input.displayName = 'PixelInput';

export { Input };

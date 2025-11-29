import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends HTMLMotionProps<"button"> {
    variant?: 'primary' | 'secondary' | 'danger' | 'success';
    size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
    children,
    className,
    variant = 'primary',
    size = 'md',
    ...props
}) => {
    const baseStyles = "rounded-full font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2";

    const variants = {
        primary: "bg-blue-400 hover:bg-blue-500 text-white shadow-blue-200",
        secondary: "bg-purple-400 hover:bg-purple-500 text-white shadow-purple-200",
        danger: "bg-red-400 hover:bg-red-500 text-white shadow-red-200",
        success: "bg-green-400 hover:bg-green-500 text-white shadow-green-200",
    };

    const sizes = {
        sm: "px-4 py-2 text-sm",
        md: "px-6 py-3 text-base",
        lg: "px-8 py-4 text-xl",
    };

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={twMerge(baseStyles, variants[variant], sizes[size], className)}
            {...props}
        >
            {children}
        </motion.button>
    );
};

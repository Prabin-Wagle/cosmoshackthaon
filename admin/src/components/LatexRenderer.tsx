import React, { useMemo } from 'react';
import 'katex/dist/katex.min.css';
import katex from 'katex';

interface LatexRendererProps {
    /** The text content that may contain LaTeX expressions */
    children: string | number;
    /** Whether to render in display mode (block) or inline mode */
    displayMode?: boolean;
    /** Additional CSS class names */
    className?: string;
}

/**
 * Renders text with LaTeX/KaTeX support.
 * 
 * Supports multiple LaTeX formats:
 * - Inline: \(...\) or $...$
 * - Display: \[...\] or $$...$$
 * - Raw KaTeX: Entire string is treated as LaTeX if it starts with common LaTeX commands
 * 
 * @example
 * // Inline math
 * <LatexRenderer>{"The area is $A = \\pi r^2$"}</LatexRenderer>
 * 
 * // Display math
 * <LatexRenderer>{"\\[\\int_0^1 x^2 dx = \\frac{1}{3}\\]"}</LatexRenderer>
 * 
 * // Mixed content
 * <LatexRenderer>{"If $x > 0$, then \\(x^2 > 0\\)"}</LatexRenderer>
 */
export const LatexRenderer: React.FC<LatexRendererProps> = ({
    children,
    displayMode = false,
    className = ''
}) => {
    const renderedContent = useMemo(() => {
        if (typeof children === 'number') {
            return String(children);
        }
        if (!children || typeof children !== 'string') {
            return '';
        }

        try {
            // Check if the entire string is a pure LaTeX expression
            const trimmed = children.trim();

            // Pure display mode: \[...\] or $$...$$
            if ((trimmed.startsWith('\\[') && trimmed.endsWith('\\]')) ||
                (trimmed.startsWith('$$') && trimmed.endsWith('$$'))) {
                const content = trimmed.startsWith('\\[')
                    ? trimmed.slice(2, -2)
                    : trimmed.slice(2, -2);
                return katex.renderToString(content, {
                    throwOnError: false,
                    displayMode: true,
                });
            }

            // Pure inline mode: \(...\)
            if (trimmed.startsWith('\\(') && trimmed.endsWith('\\)')) {
                const content = trimmed.slice(2, -2);
                return katex.renderToString(content, {
                    throwOnError: false,
                    displayMode: false,
                });
            }

            // Check if content contains any LaTeX patterns
            const containsLatex = /\$|\\\(|\\\[|\\frac|\\sqrt|\\int|\\sum|\\lim|\\dfrac|\\cfrac/.test(children);

            if (!containsLatex) {
                // No LaTeX detected, return plain text
                return escapeHtml(children);
            }

            // Mixed content: Parse and render LaTeX expressions within text
            let result = children;

            // Process display math $$...$$ first
            result = result.replace(/\$\$([^$]+)\$\$/g, (_, latex) => {
                try {
                    return katex.renderToString(latex, { throwOnError: false, displayMode: true });
                } catch {
                    return `$$${latex}$$`;
                }
            });

            // Process \[...\]
            result = result.replace(/\\\[([^\]]+)\\\]/g, (_, latex) => {
                try {
                    return katex.renderToString(latex, { throwOnError: false, displayMode: true });
                } catch {
                    return `\\[${latex}\\]`;
                }
            });

            // Process inline math $...$  (not preceded by \)
            result = result.replace(/(?<!\\)\$([^$]+)\$/g, (_, latex) => {
                try {
                    return katex.renderToString(latex, { throwOnError: false, displayMode: false });
                } catch {
                    return `$${latex}$`;
                }
            });

            // Process \(...\)
            result = result.replace(/\\\(([^)]+)\\\)/g, (_, latex) => {
                try {
                    return katex.renderToString(latex, { throwOnError: false, displayMode: false });
                } catch {
                    return `\\(${latex}\\)`;
                }
            });

            return result;
        } catch (error) {
            console.error('LaTeX rendering error:', error);
            return escapeHtml(children);
        }
    }, [children, displayMode]);

    return (
        <span
            className={`latex-content ${className}`}
            dangerouslySetInnerHTML={{ __html: renderedContent }}
        />
    );
};

/**
 * Simple HTML escape function
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Renders pure KaTeX without mixed content parsing.
 * Use this when you know the entire content is a LaTeX expression.
 */
export const PureLatexRenderer: React.FC<LatexRendererProps> = ({
    children,
    displayMode = false,
    className = ''
}) => {
    const html = useMemo(() => {
        if (typeof children === 'number') {
            return String(children);
        }
        if (!children || typeof children !== 'string') {
            return '';
        }
        try {
            return katex.renderToString(children, {
                throwOnError: false,
                displayMode,
            });
        } catch (error) {
            console.error('KaTeX rendering error:', error);
            return children;
        }
    }, [children, displayMode]);

    return (
        <span
            className={className}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
};

export default LatexRenderer;

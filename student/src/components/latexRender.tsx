import React, { useMemo } from 'react';
import 'katex/dist/katex.min.css';
import katex from 'katex';

interface LatexRendererProps {

    children: string;

    displayMode?: boolean;

    className?: string;
}

export const LatexRenderer: React.FC<LatexRendererProps> = ({
    children,
    displayMode = false,
    className = ''
}) => {
    const renderedContent = useMemo(() => {
        if (!children || typeof children !== 'string') {
            return children || '';
        }

        try {

            const trimmed = children.trim();

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

            if (trimmed.startsWith('\\(') && trimmed.endsWith('\\)')) {
                const content = trimmed.slice(2, -2);
                return katex.renderToString(content, {
                    throwOnError: false,
                    displayMode: false,
                });
            }

            const containsLatex = /\$|\\\(|\\\[|\\frac|\\sqrt|\\int|\\sum|\\lim|\\dfrac|\\cfrac/.test(children);

            if (!containsLatex) {

                return escapeHtml(children);
            }

            let result = children;

            result = result.replace(/\$\$([^$]+)\$\$/g, (_, latex) => {
                try {
                    return katex.renderToString(latex, { throwOnError: false, displayMode: true });
                } catch {
                    return `$$${latex}$$`;
                }
            });

            result = result.replace(/\\\[([^\]]+)\\\]/g, (_, latex) => {
                try {
                    return katex.renderToString(latex, { throwOnError: false, displayMode: true });
                } catch {
                    return `\\[${latex}\\]`;
                }
            });

            result = result.replace(/(?<!\\)\$([^$]+)\$/g, (_, latex) => {
                try {
                    return katex.renderToString(latex, { throwOnError: false, displayMode: false });
                } catch {
                    return `$${latex}$`;
                }
            });

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

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export const PureLatexRenderer: React.FC<LatexRendererProps> = ({
    children,
    displayMode = false,
    className = ''
}) => {
    const html = useMemo(() => {
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


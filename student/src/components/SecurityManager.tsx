import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { addListener, launch, stop } from 'devtools-detector';

declare global {
    interface Window {
        disableSecurity?: boolean;
    }
}

const SecurityManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isViolation, setIsViolation] = useState(false);
    const [isBlurred, setIsBlurred] = useState(false);
    const [shouldShowBlur, setShouldShowBlur] = useState(false);
    const location = useLocation();

    // Pages where security should be completely disabled
    const isPublicPage = ['/login', '/register', '/verify-otp', '/forgot-password'].includes(location.pathname);
    const isBypassed = isPublicPage || window.disableSecurity === true;

    useEffect(() => {
        // 1. Iframe Protection (Anti-Clickjacking)
        if (window.self !== window.top) {
            try {
                if (window.top) window.top.location.href = window.location.href;
            } catch (e) {
                setIsViolation(true);
            }
        }

        // 2. DevTools Detection
        const handleDevToolsChange = (isOpen: boolean) => {
            if (isOpen && !isBypassed) {
                setIsViolation(true);
            }
        };

        addListener(handleDevToolsChange);
        launch();

        // 3. Anti-Debugging Loop
        const debugLoop = setInterval(() => {
            if (isBypassed) return;
            const startTime = performance.now();
            // eslint-disable-next-line no-debugger
            debugger;
            const endTime = performance.now();
            if (endTime - startTime > 100) {
                setIsViolation(true);
            }
        }, 1000);

        // 4. Focus & Visibility Protection - DISABLED BLUR (User Request)
        /* 
        let blurTimeout: ReturnType<typeof setTimeout> | null = null;
        ... 
        */

        // 5. Event Blocking (Keyboard & Mouse)
        const preventDevTools = (e: KeyboardEvent) => {
            if (isBypassed) return;
            // Disable F12, Ctrl+Shift+I/J/C, Ctrl+U, Cmd+Opt+I/J/C/U
            const isInspect = (e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase());
            const isSource = (e.ctrlKey || e.metaKey) && e.key.toUpperCase() === 'U';
            const isPrint = (e.ctrlKey || e.metaKey) && e.key.toUpperCase() === 'P';

            if (e.key === 'F12' || isInspect || isSource || isPrint) {
                e.preventDefault();
                setIsViolation(true);
                return false;
            }
        };

        const preventContextMenu = (e: MouseEvent) => {
            if (isBypassed) return;
            e.preventDefault();
            return false;
        };

        const preventCopy = (e: ClipboardEvent) => {
            if (isBypassed) return;
            e.preventDefault();
            return false;
        };

        window.addEventListener('keydown', preventDevTools);
        window.addEventListener('contextmenu', preventContextMenu);
        window.addEventListener('copy', preventCopy);
        window.addEventListener('dragstart', (e) => {
            if (!isBypassed) e.preventDefault();
        });

        return () => {
            stop();
            clearInterval(debugLoop);
            // window.removeEventListener('blur', handleBlur);
            // window.removeEventListener('focus', handleFocus);
            // document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('keydown', preventDevTools);
            window.removeEventListener('contextmenu', preventContextMenu);
            window.removeEventListener('copy', preventCopy);
        };
    }, [isBypassed]);

    if (isViolation) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: '#000',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 999999,
                flexDirection: 'column',
                fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Security Violation</h1>
                <p style={{ opacity: 0.8 }}>Developer tools are not allowed. Please close them and refresh the page.</p>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        marginTop: '2rem',
                        padding: '0.8rem 1.5rem',
                        backgroundColor: '#fff',
                        color: '#000',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    Refresh Page
                </button>
            </div>
        );
    }

    return (
        <div style={{
            height: '100%',
            userSelect: isBypassed ? 'text' : 'none',
            WebkitUserSelect: isBypassed ? 'text' : 'none'
        }}>
            {children}
        </div>
    );
};

export default SecurityManager;

/**
 * DEPRECATED: This manager has been replaced by the Educational Partners system.
 * Ads are now integrated into the Partners feature to provide a cleaner, 
 * institution-focused experience on the landing page.
 */
import React from 'react';
import { Navigate } from 'react-router-dom';

const AdsManager: React.FC = () => {
    return <Navigate to="/partners" replace />;
};

export default AdsManager;

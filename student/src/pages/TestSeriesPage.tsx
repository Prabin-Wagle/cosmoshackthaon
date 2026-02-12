import React from 'react';
import TestSeriesCollectionList from '../components/TestSeries/TestSeriesCollectionList';

const TestSeriesPage: React.FC = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight uppercase underline decoration-blue-600 decoration-4 underline-offset-8">
                Test Series
            </h1>
            <TestSeriesCollectionList />
        </div>
    );
};

export default TestSeriesPage;

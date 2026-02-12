import { Resource, ResourceType, Subject } from '../types/resources';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { RESOURCE_TYPES } from '../types/resources';

interface ClassSubjectDetailsProps {
    subjectName: string;
    subject?: Subject;
    resourcesMap: Record<ResourceType, Resource[]>;
    availableTypes: ResourceType[];
    userClass?: string;
    userFaculty?: string;
}

export default function ClassSubjectDetails({
    subjectName,
    subject,
    resourcesMap,
    availableTypes,
    userClass,
    userFaculty
}: ClassSubjectDetailsProps) {
    const navigate = useNavigate();

    const handleResourceClick = (resourceType: ResourceType) => {
        navigate(`/subjects/${subjectName}/${resourceType}`, {
            state: {
                subject,
                resources: resourcesMap[resourceType]
            }
        });
    };

    const getResourceConfig = (type: ResourceType) => {
        return RESOURCE_TYPES.find(rt => rt.type === type);
    };

    const getColorClasses = (color: string) => {
        const colorMap: Record<string, { bg: string; hover: string; text: string; icon: string }> = {
            blue: { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', text: 'text-blue-700', icon: 'bg-blue-100' },
            green: { bg: 'bg-green-50', hover: 'hover:bg-green-100', text: 'text-green-700', icon: 'bg-green-100' },
            purple: { bg: 'bg-purple-50', hover: 'hover:bg-purple-100', text: 'text-purple-700', icon: 'bg-purple-100' },
            orange: { bg: 'bg-orange-50', hover: 'hover:bg-orange-100', text: 'text-orange-700', icon: 'bg-orange-100' },
            pink: { bg: 'bg-pink-50', hover: 'hover:bg-pink-100', text: 'text-pink-700', icon: 'bg-pink-100' },
            indigo: { bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100', text: 'text-indigo-700', icon: 'bg-indigo-100' },
            yellow: { bg: 'bg-yellow-50', hover: 'hover:bg-yellow-100', text: 'text-yellow-700', icon: 'bg-yellow-100' },
            teal: { bg: 'bg-teal-50', hover: 'hover:bg-teal-100', text: 'text-teal-700', icon: 'bg-teal-100' },
            cyan: { bg: 'bg-cyan-50', hover: 'hover:bg-cyan-100', text: 'text-cyan-700', icon: 'bg-cyan-100' }
        };
        return colorMap[color] || colorMap.blue;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <button
                    onClick={() => navigate('/subjects')}
                    className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Subjects
                </button>

                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white">
                    <h1 className="text-3xl font-bold mb-2">{decodeURIComponent(subjectName || '')}</h1>
                    <p className="text-blue-100">
                        {userClass} - {userFaculty}
                    </p>
                    {subject?.subject_code && (
                        <span className="inline-block mt-3 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
                            {subject.subject_code}
                        </span>
                    )}
                </div>
            </div>

            {/* Resource Types */}
            {availableTypes.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="text-6xl mb-4">📚</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No Resources Available
                    </h3>
                    <p className="text-gray-600">
                        Resources for this subject will be added soon.
                    </p>
                </div>
            ) : (
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Available Resources
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {availableTypes.map((type) => {
                            const config = getResourceConfig(type);
                            if (!config) return null;

                            const colors = getColorClasses(config.color);
                            const count = resourcesMap[type]?.length || 0;

                            return (
                                <div
                                    key={type}
                                    onClick={() => handleResourceClick(type)}
                                    className={`${colors.bg} ${colors.hover} rounded-xl p-6 cursor-pointer
                           transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-2 border-transparent hover:border-current`}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`${colors.icon} rounded-lg p-3 text-2xl`}>
                                            {config.icon}
                                        </div>
                                        <span className={`${colors.text} text-sm font-semibold bg-white px-3 py-1 rounded-full`}>
                                            {count} {count === 1 ? 'item' : 'items'}
                                        </span>
                                    </div>

                                    <h3 className={`text-lg font-semibold ${colors.text} mb-1`}>
                                        {config.label}
                                    </h3>

                                    <p className="text-sm text-gray-600 mb-4">
                                        Access {config.label.toLowerCase()} for this subject
                                    </p>

                                    <div className={`flex items-center ${colors.text} font-medium text-sm`}>
                                        View All →
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

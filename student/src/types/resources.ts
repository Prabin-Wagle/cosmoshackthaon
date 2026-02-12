export interface Subject {
    id: number;
    subject_name: string;
    subject_code?: string;
    credit?: number;
    type?: string;
}

export interface Resource {
    id: number;
    class: string;
    faculty?: string;
    subjectName: string;
    chapter?: string;
    chapterName: string;
    driveLink?: string;
    link?: string; // Used by competitive resources
    visibility?: string;
    exam_type?: string;
    image?: string; // We will not render this, but it exists in the data

    // New unified system fields
    subject?: string;
    unit?: string;
    resource_type?: string;
    chapter_name?: string;
    upload_mode?: 'link' | 'manual';
    file_data?: string;
    created_at?: string;
}

export type ResourceType =
    | 'note'
    | 'numerical'
    | 'practical'
    | 'project'
    | 'grammar'
    | 'freewriting'
    | 'givereason'
    | 'miq'
    | 'mifs'
    | 'book';

export interface ResourceTypeConfig {
    type: ResourceType;
    label: string;
    icon: string;
    color: string;
    endpoint: string;
}

export const RESOURCE_TYPES: ResourceTypeConfig[] = [
    {
        type: 'note',
        label: 'Notes',
        icon: '📚',
        color: 'blue',
        endpoint: '/api/datafetch/getnote.php'
    },
    {
        type: 'numerical',
        label: 'Numericals',
        icon: '🔢',
        color: 'green',
        endpoint: '/api/datafetch/getnumerical.php'
    },
    {
        type: 'practical',
        label: 'Practicals',
        icon: '🔬',
        color: 'purple',
        endpoint: '/api/datafetch/getpractical.php'
    },
    {
        type: 'project',
        label: 'Projects',
        icon: '🚀',
        color: 'orange',
        endpoint: '/api/datafetch/getproject.php'
    },
    {
        type: 'grammar',
        label: 'Grammar',
        icon: '📝',
        color: 'pink',
        endpoint: '/api/datafetch/getgrammar.php'
    },
    {
        type: 'freewriting',
        label: 'Free Writing',
        icon: '✍️',
        color: 'indigo',
        endpoint: '/api/datafetch/getfreewritting.php'
    },
    {
        type: 'givereason',
        label: 'Give Reason',
        icon: '💡',
        color: 'yellow',
        endpoint: '/api/datafetch/getgiver reason.php'
    },
    {
        type: 'miq',
        label: 'Most Important Questions',
        icon: '🎯',
        color: 'teal',
        endpoint: '/api/datafetch/getmiq.php'
    },
    {
        type: 'mifs',
        label: 'Most Important Formulas',
        icon: '📖',
        color: 'cyan',
        endpoint: '/api/datafetch/getmifs.php'
    },
    {
        type: 'book',
        label: 'Books',
        icon: '📕',
        color: 'red',
        endpoint: '/api/datafetch/getbook.php'
    }
];

export interface SubjectResourcesResponse {
    data: Resource[];
    status: string;
}

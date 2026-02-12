import axiosClient from '../api/axiosClient';
import type { Subject, Resource, SubjectResourcesResponse, ResourceType } from '../types/resources';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'NoteLibrarySecur3_2026_SecretKey';
const ENCRYPTION_IV = '1234567890123456';

// Fetch subjects based on user's class and faculty
export const fetchSubjects = async (classNum: string, faculty: string): Promise<Subject[]> => {
    try {
        // Normalize the class and faculty to match database table naming
        // e.g., "Class 12" -> "class12", "Science" -> "science"
        const normalizedClass = classNum.toLowerCase().replace(/\s+/g, '');
        const normalizedFaculty = faculty.toLowerCase().replace(/\s+/g, '');
        const tableName = `${normalizedClass}_${normalizedFaculty}`;

        const payload = JSON.stringify({
            action: 'subjects',
            table: tableName
        });

        const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
        const iv = CryptoJS.enc.Utf8.parse(ENCRYPTION_IV);
        const encrypted = CryptoJS.AES.encrypt(payload, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        }).toString();

        const response = await axiosClient.get(`/api/users/subjects.php`, {
            params: {
                d: encrypted
            }
        });

        if (response.data.success && response.data.subjects) {
            return response.data.subjects;
        }
        return [];
    } catch (error) {
        console.error('Error fetching subjects:', error);
        return [];
    }
};

// Fetch competitive exam subjects
export const fetchCompetitiveSubjects = async (examType: string): Promise<Subject[]> => {
    try {
        const formData = new FormData();
        formData.append('exam_type', examType);

        const response = await axiosClient.post(`/api/datafetch/getcompetitive.php`, formData);

        if (response.data.success && response.data.subjects) {
            return response.data.subjects;
        }
        return [];
    } catch (error) {
        console.error('Error fetching competitive subjects:', error);
        return [];
    }
};

// Fetch resources for a specific subject and resource type
export const fetchResources = async (
    classNum: string,
    faculty: string,
    subjectName: string,
    resourceType: ResourceType,
    examType?: string
): Promise<Resource[]> => {
    try {
        const payloadData: any = { subjectName };
        if (examType) {
            payloadData.exam_type = examType;
        } else {
            const normalizedClass = classNum.toLowerCase().replace(/\s+/g, '');
            const normalizedFaculty = faculty.toLowerCase().replace(/\s+/g, '');
            payloadData.class = normalizedClass;
            payloadData.faculty = normalizedFaculty;
        }

        const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
        const iv = CryptoJS.enc.Utf8.parse(ENCRYPTION_IV);
        const encrypted = CryptoJS.AES.encrypt(JSON.stringify(payloadData), key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        }).toString();

        const formData = new FormData();
        formData.append('d', encrypted);

        let endpoint: string = examType ? 'getcompetitive.php' : getResourceEndpoint(resourceType);

        const response = await axiosClient.post<SubjectResourcesResponse>(
            `/api/datafetch/${endpoint}`,
            formData
        );

        if (response.data.status === 'true' && response.data.data) {
            return response.data.data;
        }
        return [];
    } catch (error) {
        console.error(`Error fetching ${resourceType}:`, error);
        return [];
    }
};

// Helper function to get endpoint filename for resource type
const getResourceEndpoint = (resourceType: ResourceType): string => {
    const endpoints: Record<ResourceType, string> = {
        note: 'getnote.php',
        numerical: 'getnumerical.php',
        practical: 'getpractical.php',
        project: 'getproject.php',
        grammar: 'getgrammar.php',
        freewriting: 'getfreewritting.php',
        givereason: 'getgivereason.php',
        miq: 'getmiq.php',
        mifs: 'getmifs.php',
        book: 'getbook.php'
    };
    return endpoints[resourceType];
};

// Fetch unified resources for a subject using the new system
export const fetchUnifiedResources = async (
    classNum: string,
    faculty: string,
    subjectName: string
): Promise<Resource[]> => {
    try {
        const payload = JSON.stringify({
            class_level: classNum,
            faculty: faculty,
            subject: subjectName
        });

        const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
        const iv = CryptoJS.enc.Utf8.parse(ENCRYPTION_IV);
        const encryptedInput = CryptoJS.AES.encrypt(payload, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        }).toString();

        const response = await axiosClient.get(`/api/users/resources.php`, {
            params: {
                d: encryptedInput
            }
        });

        if (response.data.success) {
            let resources = [];

            if (response.data.encrypted && response.data.payload) {
                try {
                    const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
                    const iv = CryptoJS.enc.Utf8.parse(ENCRYPTION_IV);
                    const decrypted = CryptoJS.AES.decrypt(response.data.payload, key, {
                        iv: iv,
                        mode: CryptoJS.mode.CBC,
                        padding: CryptoJS.pad.Pkcs7
                    });
                    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
                    const finalData = JSON.parse(decryptedText);
                    resources = finalData.resources || [];
                } catch (e) {
                    console.error("Decryption failed for resources:", e);
                    return [];
                }
            } else {
                resources = response.data.resources || [];
            }

            return resources;
        }
        return [];
    } catch (error) {
        console.error('Error fetching unified resources:', error);
        return [];
    }
};

// Check which resource types have data for a subject
export const checkAvailableResources = async (
    classNum: string,
    faculty: string,
    subjectName: string,
    resourceTypes: ResourceType[]
): Promise<ResourceType[]> => {
    const availableTypes: ResourceType[] = [];

    // Check each resource type in parallel
    const checks = resourceTypes.map(async (type) => {
        const resources = await fetchResources(classNum, faculty, subjectName, type);
        if (resources.length > 0) {
            availableTypes.push(type);
        }
    });

    await Promise.all(checks);
    return availableTypes;
};

// Fetch all available resources for a subject
export const fetchAllSubjectResources = async (
    classNum: string,
    faculty: string,
    subjectName: string,
    examType?: string
): Promise<Record<ResourceType, Resource[]>> => {
    const allResourceTypes: ResourceType[] = [
        'note',
        'numerical',
        'practical',
        'project',
        'grammar',
        'freewriting',
        'givereason',
        'miq',
        'mifs'
    ];

    const resourcesMap: Record<string, Resource[]> = {};

    // If it's a regular curriculum subject, use the new unified API
    if (!examType) {
        const unifiedResources = await fetchUnifiedResources(classNum, faculty, subjectName);

        // Map the unified resources back into the ResourceType-based map for the UI
        allResourceTypes.forEach(type => {
            const filtered = unifiedResources.filter(r => {
                const rt = r.resource_type?.toLowerCase() || '';
                const target = type.toLowerCase();
                // Check for exact match (e.g. 'note' === 'note')
                // or plural match (e.g. 'notes' contains 'note')
                return rt === target || rt === target + 's' || rt.includes(target);
            });

            if (filtered.length > 0) {
                // Map new fields to old fields for compatibility with existing UI
                resourcesMap[type] = filtered.map(r => ({
                    ...r,
                    chapter: r.unit || r.chapter || 'General',
                    chapterName: r.chapter_name || r.chapterName || '',
                    driveLink: r.upload_mode === 'link' ? r.file_data : (r.driveLink || '')
                }));
            }
        });

        return resourcesMap as Record<ResourceType, Resource[]>;
    }

    // Fallback for competitive or if we still use old endpoints
    // Fetch all resource types in parallel
    const fetches = allResourceTypes.map(async (type) => {
        const resources = await fetchResources(classNum, faculty, subjectName, type, examType);
        if (resources.length > 0) {
            resourcesMap[type] = resources;
        }
    });

    await Promise.all(fetches);
    return resourcesMap as Record<ResourceType, Resource[]>;
};

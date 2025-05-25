export interface UserPreferences {
    aiPlatform: 'chatgpt' | 'gemini' | 'claude' | null;
    customPrompt: string;
}

export interface TranscriptSegment {
    text: string;
    timestamp?: string;
}

export interface MessageRequest {
    action: 'openTab' | 'getPreferences' | 'savePreferences';
    url?: string;
    preferences?: UserPreferences
}

export interface MessageResponse {
    success: boolean;
    data?: any;
    error?: string;
}

export interface AIplatformConfig {
    name: string;
    baseUrl: string;
    urlTemplate: (prompt:string) => string;
}

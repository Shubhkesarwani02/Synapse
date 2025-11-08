// MVP: Hardcoded user ID for showcase
// Declare as global variable for use across extension scripts
// Using var instead of const to ensure it's accessible across all loaded scripts
var USER_ID = "mvp_demo_user_2024";

// Message types for communication between extension and page contexts
var MESSAGE_TYPES = {
    GET_USER_ID: 'SABKI_SOCH_GET_USER_ID',
    GET_CONTEXTS: 'SABKI_SOCH_GET_CONTEXTS',
    ACTION: 'SABKI_SOCH_ACTION',
    USER_ID_RESPONSE: 'SABKI_SOCH_USER_ID_RESPONSE',
    CONTEXTS_RESPONSE: 'SABKI_SOCH_CONTEXTS_RESPONSE',
    RESPONSE: 'SABKI_SOCH_RESPONSE',
    FROM_SABKI_SOCH: 'sabki_soch'
};

// Actions for component.js communication
var ACTIONS = {
    STORE_CONTEXT: 'store_context',
    LOAD_CONTEXT: 'load_context',
    LOAD_CONTEXT_BY_ID: 'load_context_by_id',
    CLEAR_DATA: 'clear_data',
    INJECT_CONTEXT: 'inject_context',
    DELETE_CONTEXT: 'delete_context',
    SAVE_CONTENT: 'save_content'
};

// Chrome runtime actions
var CHROME_RUNTIME_ACTIONS = {
    PAGE_API_DATA: 'PAGE_API_DATA'
};

// ==================================================
// GLOBAL CONFIGURATION & STATE
// ==================================================

/**
 * Application configuration constants
 */
const CONFIG = {
    MAX_SAVED_PROJECTS: 10,
    AUTO_SAVE_INTERVAL: 30000, // 30 seconds
    READING_SPEED_WPM: 250,
    VERSION: '1.1.0'
};

/**
 * Global application state
 */
let bookData = {
    id: 'current',
    title: '',
    category: '',
    targetAudience: '',
    topic: '',
    styleDirection: '',
    styleExample: '',
    numSections: 12,
    targetWordCount: 2000,
    blueprint: '',
    sectionOutline: '',
    sections: [],
    summary: '',
    currentStep: 'setup',
    createdAt: new Date().toISOString(),
    lastSaved: new Date().toISOString()
};


/**
 * AI settings and configuration
 */
let aiSettings = {
    apiProvider: 'openrouter',
    openrouterApiKey: '',
    openaiApiKey: '',
    model: 'anthropic/claude-3.5-sonnet',
    temperature: 0.7,
    maxTokens: 50000,
    advancedModelsEnabled: false,
    advancedModels: {},
    customPrompts: {
        blueprint: '',
        outline: '',
        writing: '',
        analysis: '',
        improvement: '',
        manualImprovement: '',
        randomIdea: ''
    }
};

/**
 * Runtime state variables
 */
let projects = {};
let autoSaveTimer;
let oneClickCancelled = false;
let currentExpandedSection = null;
let currentTheme = 'light';
let selectedDonationAmount = 5;
let isGenerating = false;

/**
 * Undo/Redo system
 */
let undoStack = [];
let redoStack = [];
const MAX_UNDO_STATES = 50;

// ==================================================
// CUSTOM ALERT SYSTEM
// ==================================================

let alertCallback = null;
let inputCallback = null;

/**
 * Show custom alert dialog
 * @param {string} message - Alert message
 * @param {string} title - Alert title
 * @returns {Promise<boolean>}
 */
function customAlert(message, title = 'Notification') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-alert-modal');
        const titleElement = document.getElementById('alert-title');
        const messageElement = document.getElementById('alert-message');
        const okBtn = document.getElementById('alert-ok-btn');
        const cancelBtn = document.getElementById('alert-cancel-btn');
        
        titleElement.textContent = title;
        
        // For cost estimation, use direct HTML and adjust modal width
        if (title === 'Cost Estimation') {
            messageElement.innerHTML = message;
            messageElement.style.fontFamily = '';
            messageElement.style.fontSize = '';
            messageElement.style.lineHeight = '';
            messageElement.style.textAlign = 'left';
            messageElement.style.whiteSpace = 'normal';
            messageElement.style.overflowWrap = '';
            messageElement.style.fontWeight = '';
            modal.querySelector('.modal-content').style.maxWidth = '600px';
            modal.querySelector('.modal-content').style.width = '95%';
        } else {
            messageElement.innerHTML = message.replace(/\n/g, '<br>');
            // Reset to default styling for other alerts
            messageElement.style.fontSize = '';
            messageElement.style.lineHeight = '';
            messageElement.style.textAlign = 'center';
            messageElement.style.whiteSpace = '';
            messageElement.style.overflowWrap = '';
            messageElement.style.fontWeight = '';
            modal.querySelector('.modal-content').style.maxWidth = '500px';
            modal.querySelector('.modal-content').style.width = '90%';
        }
        
        okBtn.style.display = 'inline-flex';
        cancelBtn.style.display = 'none';
        
        alertCallback = resolve;
        modal.classList.add('active');
        
        // Ensure modal opens at the top - use setTimeout to ensure DOM is fully rendered
        setTimeout(() => {
            modal.scrollTop = 0;
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.scrollTop = 0;
            }
            // For Cost Estimation, also scroll the message element to top
            if (title === 'Cost Estimation') {
                messageElement.scrollTop = 0;
            }
        }, 10);
        
        okBtn.focus();
    });
}

/**
 * Show custom confirmation dialog
 * @param {string} message - Confirmation message
 * @param {string} title - Dialog title
 * @returns {Promise<boolean>}
 */
function customConfirm(message, title = 'Confirmation') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-alert-modal');
        const titleElement = document.getElementById('alert-title');
        const messageElement = document.getElementById('alert-message');
        const okBtn = document.getElementById('alert-ok-btn');
        const cancelBtn = document.getElementById('alert-cancel-btn');
        
        titleElement.textContent = title;
        messageElement.textContent = message;
        
        okBtn.style.display = 'inline-flex';
        cancelBtn.style.display = 'inline-flex';
        okBtn.textContent = 'Yes';
        cancelBtn.textContent = 'No';
        
        alertCallback = resolve;
        modal.classList.add('active');
        cancelBtn.focus();
    });
}

/**
 * Show custom input dialog
 * @param {string} message - Input message
 * @param {string} title - Dialog title
 * @param {string} defaultValue - Default input value
 * @returns {Promise<string|null>}
 */
function customInput(message, title = 'Input', defaultValue = '') {
    return new Promise((resolve) => {
        // Use existing modal from HTML
        const modal = document.getElementById('custom-input-modal');
        if (!modal) {
            console.error('Custom input modal not found in HTML');
            resolve(null);
            return;
        }
        
        document.getElementById('input-title').textContent = title;
        document.getElementById('input-message').textContent = message;
        document.getElementById('input-field').value = defaultValue;
        
        inputCallback = resolve;
        modal.classList.add('active');
        document.getElementById('input-field').focus();
        document.getElementById('input-field').select();
    });
}

/**
 * Close custom input dialog
 * @param {string|null} result - Input result
 */
function closeCustomInput(result) {
    const modal = document.getElementById('custom-input-modal');
    modal.classList.remove('active');
    
    if (inputCallback) {
        inputCallback(result);
        inputCallback = null;
    }
}

/**
 * Close custom alert/confirm dialog
 * @param {boolean} result - Dialog result
 */
function closeCustomAlert(result = true) {
    const modal = document.getElementById('custom-alert-modal');
    const okBtn = document.getElementById('alert-ok-btn');
    
    modal.classList.remove('active');
    okBtn.textContent = 'OK';
    
    if (alertCallback) {
        alertCallback(result);
        alertCallback = null;
    }
}

// ==================================================
// API MODELS CONFIGURATION
// ==================================================

/**
 * Available AI models by provider
 */
const apiModels = {
    openrouter: {
        Recommended: [
            { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4', cost: { input: 3.00, output: 15.00 }},
            { value: 'anthropic/claude-opus-4.1', label: 'Claude Opus 4.1', cost: { input: 15.00, output: 75.00 }},
            { value: 'openai/gpt-5', label: 'GPT-5', cost: { input: 1.25, output: 10.00 }} 
        ],
        
        More: [
            { value: 'openai/gpt-4o', label: 'GPT-4o', cost: { input: 5.00, output: 15.00 }},
            { value: 'anthropic/claude-3.7-sonnet:thinking', label: 'Claude Sonnet 3.7 (Thinking)', cost: { input: 3.00, output: 15.00 }},
            { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', cost: { input: 1.25, output: 10.00 }},
            { value: 'x-ai/grok-4', label: 'Grok 4', cost: { input: 3.00, output: 15.00 }},
            { value: 'perplexity/sonar-reasoning-pro', label: 'Sonar Reasoning Pro', cost: { input: 2.00, output: 8.00 }},
            { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini', cost: { input: 0.25, output: 2.00 }},
            { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', cost: { input: 0.15, output: 0.60 }},
            { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano', cost: { input: 0.05, output: 0.40 }},
            { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', cost: { input: 0.30, output: 2.50 }},
            { value: 'deepseek/deepseek-chat-v3.1', label: 'DeepSeek V3.1', cost: { input: 0.20, output: 0.80 }},
            { value: 'deepseek/deepseek-chat-v3-0324:free', label: 'DeepSeek V3: FREE', cost: { input: 0.00, output: 0.00 }},
            { value: 'openai/gpt-oss-20b:free', label: 'OpenAI GPT-OSS 20B: FREE', cost: { input: 0.00, output: 0.00 }},
            { value: 'thedrummer/anubis-70b-v1.1t', label: 'Anubis 70B V1.1T', cost: { input: 0.40, output: 0.70 }},
            { value: 'microsoft/wizardlm-2-8x22b', label: 'WizardLM 2-8x22B', cost: { input: 0.48, output: 0.48 }}
        ]
    },
    openai: {
        Recommended: [
            { value: 'gpt-5', label: 'GPT-5', cost: { input: 1.25, output: 10 }},
            { value: 'gpt-4o', label: 'GPT-4o', cost: { input: 5, output: 15 }},
        ],
        More: [
            { value: 'gpt-4o-mini', label: 'GPT-4o Mini', cost: { input: 0.15, output: 0.6 }},
            { value: 'gpt-5-mini', label: 'GPT-5 Mini', cost: { input: 0.25, output: 2 }}
        ]
    }
};

// ==================================================
// CATEGORY REQUIREMENTS
// ==================================================

/**
 * Category-specific requirements and content guidelines
 */
const categoryRequirements = {
    business: {
        requirements: "Market research, case studies, actionable frameworks, ROI focus, real-world examples, implementation guides",
        guidelines: "Authority positioning, practical value, measurable outcomes, industry credibility, professional tone"
    },
    'self-help': {
        requirements: "Psychological research, personal development frameworks, step-by-step processes, transformation focus, reader exercises",
        guidelines: "Empathetic tone, practical application, evidence-based advice, inspirational examples, actionable steps"
    },
    'how-to': {
        requirements: "Clear instructions, step-by-step processes, troubleshooting guides, resource lists, skill progression",
        guidelines: "Instructional clarity, practical focus, beginner-friendly approach, comprehensive coverage, hands-on learning"
    },
    education: {
        requirements: "Academic rigor, learning objectives, knowledge progression, assessment tools, educational theory",
        guidelines: "Pedagogical structure, concept clarity, progressive difficulty, retention techniques, practical application"
    },
    health: {
        requirements: "Medical research, expert citations, safety disclaimers, evidence-based recommendations, holistic approach",
        guidelines: "Authoritative tone, safety focus, professional credibility, practical guidance, wellness-oriented"
    },
    technology: {
        requirements: "Technical accuracy, innovation focus, practical applications, future implications, accessibility for general audience",
        guidelines: "Clear explanations, forward-thinking perspective, practical relevance, innovation emphasis, accessible language"
    },
    finance: {
        requirements: "Financial accuracy, regulatory compliance, risk disclaimers, real-world examples, actionable strategies",
        guidelines: "Professional authority, risk awareness, practical application, compliance focus, results-oriented"
    },
    leadership: {
        requirements: "Management theory, leadership frameworks, team dynamics, organizational behavior, practical case studies",
        guidelines: "Executive perspective, actionable insights, proven methodologies, results-driven approach, inspirational tone"
    },
    marketing: {
        requirements: "Market analysis, consumer psychology, campaign examples, measurement frameworks, digital strategies",
        guidelines: "Results-focused, data-driven approach, creative insight, practical implementation, ROI emphasis"
    },
    productivity: {
        requirements: "Time management systems, efficiency frameworks, tool recommendations, habit formation, workflow optimization",
        guidelines: "Practical systems, measurable outcomes, habit-based approach, tool integration, efficiency focus"
    },
    science: {
        requirements: "Scientific accuracy, peer-reviewed sources, research methodology, evidence-based conclusions, accessible explanations",
        guidelines: "Academic rigor, factual accuracy, research-based approach, clear explanations, authoritative tone"
    },
    biography: {
        requirements: "Historical accuracy, primary sources, chronological structure, contextual background, personal insights",
        guidelines: "Narrative flow, factual integrity, personal perspective, historical context, engaging presentation"
    }
};

// ==================================================
// DEFAULT PROMPTS
// ==================================================

/**
 * Default AI generation prompts
 */
const defaultPrompts = {
    blueprint: `You are an expert non-fiction author and researcher creating a high-level BOOK BLUEPRINT for a {category} book targeting {targetAudience}. This blueprint provides the strategic framework and foundation - NOT detailed section outlines.

BOOK CONCEPT:
- Topic: {topic}
- Style Direction: {styleDirection}
- Sections: {numSections}
- Category Requirements: {categoryRequirements}

CREATE A HIGH-LEVEL BOOK BLUEPRINT:

## BOOK TITLE & POSITIONING
**Book Title:** A compelling, authoritative title that captures the {category} focus
**Book Description:** 2-3 paragraphs that demonstrate value and practical benefits for {targetAudience}
**Unique Value Proposition:** What makes this book essential and different from others

## CORE FRAMEWORK
**Central Problem/Opportunity:** The key challenge this book addresses for {targetAudience}
**Core Solution/Method:** Your unique approach, methodology, or system (give it a memorable name)
**Key Principles:** 3-5 fundamental concepts that underpin your approach
**Success Metrics:** How readers will measure their progress and results

## READER TRANSFORMATION
**Starting Point:** Where {targetAudience} is now (current challenges/state)
**Learning Journey:** The progression from novice to competent implementation
**End Goal:** The transformation/outcome readers achieve after implementation
**Long-term Impact:** Sustained benefits and continued growth

## AUTHORITY FOUNDATION
**Credibility Elements:** What establishes you as the authority on this topic
**Evidence Types:** Research, case studies, examples, data that support your method
**Real-world Proof:** Success stories, applications, measurable results to include

## BOOK STRUCTURE OVERVIEW
**Section Flow Logic:** How the {numSections} sections build upon each other
**Content Progression:** The logical sequence from foundation to advanced application
**Implementation Path:** How theory converts to practice throughout the book

This blueprint provides the strategic foundation for detailed section development.`, 

    outline: `You are an expert non-fiction author creating a detailed section outline for ALL {numSections} sections. Use the book blueprint to create comprehensive section breakdowns that deliver maximum value to readers.

BOOK BLUEPRINT:
{blueprint}

TARGET: {targetWordCount} words per section

CREATE COMPLETE SECTION OUTLINE FOR ALL SECTIONS (1-{numSections}):

For EACH section, provide:

**SECTION [NUMBER]: [COMPELLING TITLE]**

*Content Structure:*
- Opening Hook: Problem or opportunity that grabs attention
- Key Concepts: Main ideas and frameworks to teach
- Supporting Evidence: Research, data, examples, and case studies  
- Practical Application: Actionable steps and implementation guidance
- Section Summary: Key takeaways and bridge to next section

*Section Details:*
- Learning Objectives: What readers will know/do after this section
- Core Frameworks: Models, systems, or processes to explain
- Real-World Examples: Specific cases that illustrate concepts
- Implementation Tools: Exercises, checklists, or templates
- Word Target: ~{targetWordCount} words

*Authority Elements:* Research, expert insights, or credibility builders

---

Continue this format for ALL {numSections} sections. Ensure each section builds logically on previous knowledge while maintaining reader engagement and delivering practical value.

IMPORTANT: Generate the complete outline for ALL sections in this single response - do not split or abbreviate.`, 

    writing: `You are an expert {category} author writing Section {sectionNum}. Follow the section outline precisely while delivering authoritative, valuable content for {targetAudience}.

**SECTION {sectionNum} OUTLINE (FOLLOW EXACTLY):**
{sectionOutline}

**PREVIOUS SECTION ENDING (for smooth transition):**
{previousSectionEnding}

{styleExampleSection}

**WRITING REQUIREMENTS:**
- Target Length: {targetWordCount} words
- Style: {styleDirection}
- Category: {category}
- Audience: {targetAudience}

**CRITICAL INSTRUCTIONS:**
1. Follow the section outline exactly - cover all specified elements
2. Maintain professional, authoritative tone throughout
3. Provide concrete, actionable content readers can implement
4. Include specific examples and real-world applications
5. Balance educational content with practical implementation
6. Use clear, accessible language appropriate for {targetAudience}
7. Support key points with evidence, research, or examples

**CONTENT BALANCE:**
- Core Concepts: 40% (frameworks, models, key ideas)
- Practical Application: 35% (steps, tools, implementation)
- Supporting Evidence: 25% (examples, research, case studies)

**CATEGORY REQUIREMENTS:** {categoryRequirements}

**OUTPUT REQUIREMENTS:**
- Provide ONLY the section content - no meta commentary, notes, or explanations
- Write as a human expert, not as an AI assistant  
- No phrases like "In this section", "As we explore", "Let's examine", "It's important to note"
- No AI-generated language markers or artificial transitions
- Begin directly with substantive content
- End naturally without summary statements or "in conclusion" phrases

Write Section {sectionNum} following the outline exactly. Deliver clean, publishable content that reads naturally and authoritatively.`, 

    randomIdea: `You are a market-savvy non-fiction publishing expert and bestselling author brainstorming machine. Generate a completely original, commercially viable non-fiction book concept that would provide massive value and become a category bestseller.

REQUIREMENTS:
- Category: {category}
- Target Audience: {targetAudience}

Create a unique non-fiction book concept that includes:

1. **TOPIC & VALUE** (2-3 sentences): A compelling, original topic that solves a real problem or provides significant value to {targetAudience}. Make it unique, practical, and marketable. Think of concepts that would make someone say "I need this book right now!"

2. **STYLE DIRECTION** (1-2 sentences): Specify the writing style that would best serve this content and appeal to the target audience. Consider tone, complexity level, authority positioning, and engagement techniques.

3. **SECTION COUNT**: Recommend the optimal number of sections for this topic and audience (typically 8-15 for most non-fiction categories).

GUIDELINES:
- Address urgent, real problems or opportunities
- Ensure highly practical and actionable content
- Think about bestseller elements in {category}
- Consider current market trends and needs
- Make immediately valuable and implementable
- Position for authority and credibility
- Ensure sufficient depth for comprehensive treatment

FORMAT YOUR RESPONSE EXACTLY AS:
TOPIC: [Your 2-3 sentence topic and value proposition here]
STYLE: [Your 1-2 sentence style direction here]  
SECTIONS: [Number only]`,
    analysis: `You are a professional non-fiction editor and publishing consultant with 20+ years of experience analyzing {contentType} for {category} books targeting {targetAudience}. Provide detailed, actionable feedback while maintaining the established parameters.

CONTENT TO ANALYZE:
{content}

ESTABLISHED PARAMETERS TO MAINTAIN:
- Category: {category}
- Target Audience: {targetAudience}
- Topic: {topic}
- Style Direction: {styleDirection}
- Target Section Word Count: {targetWordCount}
- Number of Sections: {numSections}

ANALYZE WITH FOCUS ON:

1. **ADHERENCE TO ESTABLISHED PARAMETERS**:
   - Does content match the specified category requirements?
   - Is style consistent with stated direction?
   - Are section lengths appropriate for target word count?
   - Does it serve the target audience effectively?

2. **CONTENT QUALITY & STRUCTURE**:
   - Information accuracy and authority
   - Logical flow and organization
   - Practical value and actionability
   - Category-specific requirements fulfillment

3. **MARKET VIABILITY**:
   - Practical value for {targetAudience}
   - Competitive positioning in {category}
   - Reader engagement and implementation potential
   - Commercial appeal and authority

4. **TECHNICAL CRAFT**:
   - Prose quality and clarity
   - Professional tone and authority
   - Appropriate use of examples and evidence
   - Consistency of voice throughout

5. **FORMAT AND STRUCTURE**:
   - Proper organization of content (headings, sections, etc.)
   - Consistent formatting throughout
   - Appropriate use of structural elements (lists, callouts, etc.)
   - Clear transitions between concepts

6. **PRIORITY IMPROVEMENTS**:
   - List 3-5 specific, actionable improvements
   - Rank by importance to practical value and authority
   - Provide concrete solutions for each issue
   - Ensure suggestions maintain established parameters

CRITICAL: All feedback must respect and maintain the core topic, style direction, target audience, and technical specifications already established. Focus on enhancing value and authority within these constraints.`, 
    improvement: `You are a master non-fiction author and professional editor. Improve the {contentType} based on the analysis while strictly maintaining all established book parameters and requirements.

ORIGINAL CONTENT:
{originalContent}

FEEDBACK TO ADDRESS:
{feedbackContent}

MANDATORY PARAMETERS TO MAINTAIN:
- Category: {category} - Follow all category conventions and expectations
- Target Audience: {targetAudience} - Keep language and content appropriate
- Topic: {topic} - Preserve the core subject matter and value proposition
- Style Direction: {styleDirection} - Maintain the specified writing style
- Target Word Count: {targetWordCount} words per section (if applicable)
- Number of Sections: {numSections} (maintain book structure)

IMPROVEMENT REQUIREMENTS:
1. Address ALL critical issues identified in the feedback
2. Enhance execution while preserving established parameters
3. Maintain content accuracy and authority
4. Improve practical value for {targetAudience}
5. Strengthen {category} expertise and credibility
6. Enhance reader engagement and implementation potential
7. Keep the improved version within target length specifications

SPECIFIC GUIDELINES:
- If improving sections, maintain target word count of {targetWordCount}
- Preserve authoritative tone and expertise positioning
- Maintain content accuracy and logical flow
- Enhance examples and supporting evidence  
- Improve practical application for {category} readers
- Strengthen authority and credibility elements

Create a significantly improved version that addresses the feedback comprehensively while maintaining the professional and commercial vision. The result should feel like a polished, authoritative upgrade of the original content.

CRITICAL FORMAT REQUIREMENTS:
- Maintain the exact same structure and format as the original content
- Preserve all headings, sections, and organizational elements
- Keep the same content format (sections, subsections, etc.)
- Do not add new structural elements unless specifically needed for improvement
- Ensure the output has the same type of content organization as the input

Write the complete improved {contentType} with all enhancements seamlessly integrated, maintaining the original format and structure exactly.`, 
    manualImprovement: `You are a master non-fiction author and professional editor. Improve the {contentType} based on the specific feedback provided while maintaining all established book parameters unless explicitly overridden by the manual instructions.

ORIGINAL CONTENT:
{originalContent}

MANUAL FEEDBACK AND INSTRUCTIONS:
{manualFeedback}

ESTABLISHED PARAMETERS (maintain unless overridden by manual feedback):
- Category: {category}
- Target Audience: {targetAudience}  
- Topic: {topic}
- Style Direction: {styleDirection}
- Target Word Count: {targetWordCount} words per section (if applicable)
- Number of Sections: {numSections}

IMPROVEMENT APPROACH:
1. Prioritize the specific requests in the manual feedback above all else
2. If manual feedback conflicts with established parameters, follow the manual feedback
3. If manual feedback doesn't specify changes to parameters, maintain them
4. Address all points raised in the manual feedback thoroughly
5. Maintain content accuracy and authority
6. Ensure the result serves the target audience effectively

EXECUTION GUIDELINES:
- Follow manual instructions precisely, even if they deviate from original parameters
- If word count changes are requested, adjust accordingly
- If style changes are requested, implement them while maintaining quality
- If content changes are requested, ensure accuracy and authority
- Maintain professional writing quality throughout
- Preserve expertise positioning and practical value unless specifically asked to change

Create an improved version that perfectly addresses the manual feedback while maintaining the highest standards of non-fiction craft.

CRITICAL FORMAT REQUIREMENTS:
- Maintain the exact same structure and format as the original content unless manual feedback specifically requests format changes
- Preserve all headings, sections, and organizational elements
- Keep the same narrative format (sections, scenes, etc.)
- Do not add new structural elements unless specifically requested in the manual feedback
- Ensure the output maintains the same type of content organization as the input

Provide the complete improved {contentType} with manual feedback fully implemented, preserving the original format and structure unless explicitly instructed otherwise.`,

    // Specialized edit prompts for different content types
    blueprintEdit: `You are a master non-fiction author editing a BOOK BLUEPRINT for a {category} book targeting {targetAudience}. Analyze and improve the blueprint while maintaining its complete structure and format.

CURRENT BOOK BLUEPRINT:
{originalContent}

EDITING REQUIREMENTS:
- Category: {category} - Enhance category conventions and expectations
- Target Audience: {targetAudience} - Improve appeal and appropriateness
- Topic: {topic} - Strengthen the core value proposition
- Style Direction: {styleDirection} - Enhance the specified writing style
- Number of Sections: {numSections} - Maintain content structure for this length

IMPROVEMENT PRIORITIES:
1. **Content Structure Enhancement:** Strengthen logical flow, authority positioning, and value delivery
2. **Authority Development:** Deepen expertise positioning, credibility elements, and supporting evidence
3. **Reader Journey:** Enhance learning path, implementation milestones, and transformation outcomes
4. **Practical Value:** Strengthen actionable takeaways, tools, and real-world applications
5. **Commercial Appeal:** Improve marketability for {targetAudience} while maintaining professional standards
6. **Category Compliance:** Ensure all {category} expectations and requirements are properly addressed

CRITICAL FORMAT REQUIREMENTS:
- Keep the EXACT same section structure (## 0. BOOK TITLE & MARKETING, ## 1. CORE BOOK FOUNDATIONS, ## 2. CONTENT FRAMEWORK, etc.)
- Maintain all subsection formatting (**Book Title:**, **Core Promise:**, **Author Authority:**, etc.)
- Preserve the complete section breakdown and organizational flow
- Keep all organizational elements and headers identical
- Enhance content within existing structure, don't reorganize

Create an improved book blueprint that addresses weaknesses while maintaining the complete original format and structure. The result should be a polished, professional upgrade that maintains every structural element.`,

    sectionsEdit: `You are a master non-fiction author editing a complete section outline for ALL {numSections} sections. Analyze and improve the section outline while maintaining its exact structure and format.

CURRENT SECTION OUTLINE:
{originalContent}

BOOK BLUEPRINT REFERENCE:
{blueprint}

EDITING REQUIREMENTS:
- Target: {targetWordCount} words per section
- Category: {category} - Enhance category-specific value and elements
- Target Audience: {targetAudience} - Improve engagement and practical value
- Style Direction: {styleDirection} - Strengthen style consistency

IMPROVEMENT PRIORITIES:
1. **Content Flow Enhancement:** Improve section flow and learning progression balance
2. **Value Development:** Strengthen key concepts, frameworks, and practical applications per section
3. **Authority Elements:** Enhance evidence, examples, and credibility builders
4. **Implementation Focus:** Improve actionable content and reader engagement
5. **Continuity:** Ensure seamless transitions and logical knowledge progression
6. **Category Elements:** Strengthen {category} conventions and reader expectations

CRITICAL FORMAT REQUIREMENTS:
- Maintain EXACT section structure: **SECTION [NUMBER]: [TITLE]**
- Keep identical formatting for all sections (*Content Structure:*, *Section Details:*, *Authority Elements:*)
- Preserve all subsection patterns (Opening Hook, Key Concepts, Supporting Evidence, etc.)
- Maintain the same organizational flow for ALL {numSections} sections
- Keep word targets and authority elements structure
- Use the separator "---" between sections exactly as in original

Enhance each section's content while preserving the complete original format and structure. Ensure the improved outline maintains professional quality and serves as a precise content guide.`,

    sectionEdit: `You are a master {category} author editing Section {sectionNum}. Analyze and improve the section while maintaining its content flow and structure.

CURRENT SECTION CONTENT:
{originalContent}

SECTION OUTLINE REFERENCE:
{sectionOutline}

EDITING REQUIREMENTS:
- Target Length: {targetWordCount} words (maintain approximate length)
- Style: {styleDirection} - Enhance and strengthen style consistency
- Audience: {targetAudience} - Improve engagement and practical value
- Category: {category} - Strengthen category elements and expertise

IMPROVEMENT PRIORITIES:
1. **Content Flow:** Enhance pacing, concept transitions, and learning progression
2. **Authority Voice:** Strengthen professional tone, expertise positioning, and credibility
3. **Practical Value:** Improve actionable content, examples, and implementation guidance
4. **Style Refinement:** Enhance {styleDirection} elements and professional craft
5. **Category Enhancement:** Strengthen {category} conventions, authority, and reader expectations
6. **Implementation Impact:** Deepen practical applications and real-world value

CRITICAL GUIDELINES:
- Maintain the section's existing knowledge progression and key concepts
- Preserve authority positioning and content continuity
- Keep the same general structure and learning flow
- Enhance without adding major new conceptual elements
- Maintain consistency with the section outline
- Preserve the section's role in the overall book structure

Create an improved section that addresses weaknesses in execution while maintaining the existing content structure and learning progression. Focus on craft enhancement rather than structural changes.`
};

// ==================================================
// THEME MANAGEMENT
// ==================================================

const themes = ['light', 'dark'];

/**
 * Change theme based on dropdown selection
 */
function changeTheme() {
    const selectedTheme = document.getElementById('theme-select').value;
    setTheme(selectedTheme);
}

/**
 * Switch theme using button-based toggle
 * @param {string} theme - Theme name
 */
function switchTheme(theme) {
    setTheme(theme);
    
    // Update button states
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === theme) {
            btn.classList.add('active');
        }
    });
}

/**
 * Set application theme
 * @param {string} theme - Theme name
 */
function setTheme(theme) {
    currentTheme = theme;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('novelfactory_theme', theme);
    
    // Update theme button active states
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-theme') === theme) {
            btn.classList.add('active');
        }
    });
}

/**
 * Toggle through themes programmatically
 */
function toggleTheme() {
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
}

// ==================================================
// NAVIGATION SYSTEM
// ==================================================

/**
 * Show specific step and handle initialization
 * @param {string} stepName - Step identifier
 */
function showStep(stepName) {
    // Hide all steps
    const steps = document.querySelectorAll('.step');
    steps.forEach(step => step.classList.remove('active'));
    
    // Remove active class from all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    // Show selected step
    const targetStep = document.getElementById(stepName);
    if (targetStep) {
        targetStep.classList.add('active');
    }
    
    // Add active class to clicked nav item
    const activeNavItem = document.querySelector(`[data-step="${stepName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Special handling for writing step - ensure it's properly initialized
    if (stepName === 'writing') {
        ensureWritingInterfaceInitialized();
    }
    
    // Special handling for export step - update stats
    if (stepName === 'export') {
        updateBookStats();
    }
    
    bookData.currentStep = stepName;
    updateNavProgress();
    autoSave();
}

/**
 * Ensure writing interface is properly initialized when accessed
 */
function ensureWritingInterfaceInitialized() {
    const container = document.getElementById('sections-container');
    const placeholder = container.querySelector('.writing-placeholder');
    
    // Check if interface needs initialization
    if (placeholder || container.children.length === 0 || container.innerHTML.includes('Setting up')) {
        setupWritingInterface();
    }
}

/**
 * Update navigation progress indicator
 */
function updateNavProgress() {
    const steps = ['setup', 'blueprint', 'sections', 'writing', 'export'];
    const currentIndex = steps.indexOf(bookData.currentStep);
    const progress = currentIndex >= 0 ? ((currentIndex + 1) / steps.length) * 100 : 0;
    
    const progressLine = document.getElementById('nav-progress-line');
    if (progressLine) {
        progressLine.style.width = `${progress}%`;
    }
    
    // Only set active step, no completed states
    steps.forEach((step, index) => {
        const navItem = document.querySelector(`[data-step="${step}"]`);
        if (navItem) {
            navItem.classList.remove('completed', 'active');
            if (index === currentIndex) {
                navItem.classList.add('active');
            }
        }
    });
}

// ==================================================
// COLLAPSIBLE SECTIONS
// ==================================================

/**
 * Toggle collapsible section visibility
 * @param {HTMLElement} header - Section header element
 */
function toggleCollapsibleSection(header) {
    const section = header.closest('.collapsible-section');
    const content = section.querySelector('.collapsible-content');
    const icon = header.querySelector('.toggle-icon');
    
    if (content.style.display === 'none' || !content.style.display) {
        content.style.display = 'block';
        icon.textContent = '▲';
        section.classList.add('expanded');
    } else {
        content.style.display = 'none';
        icon.textContent = '▼';
        section.classList.remove('expanded');
    }
}

/**
 * Toggle advanced models section specifically
 */
function toggleAdvancedModelsSection() {
    const section = document.querySelector('.advanced-models-section');
    const content = section.querySelector('.collapsible-content');
    const icon = section.querySelector('.toggle-icon');
    
    if (content.style.display === 'none' || !content.style.display) {
        content.style.display = 'block';
        icon.textContent = '▲';
        section.classList.add('expanded');
    } else {
        content.style.display = 'none';
        icon.textContent = '▼';
        section.classList.remove('expanded');
    }
}

/**
 * Collapse toggle removed for per-section controls
 * (Global "Collapse Sections" button is no longer used)
 */

// ==================================================
// EVENT LISTENERS SETUP
// ==================================================

/**
 * Set up all event listeners for the application
 */
function setupEventListeners() {
    const categorySelect = document.getElementById('category');
    const audienceSelect = document.getElementById('target-audience');

    // Random idea button styling based on selection
    function checkRandomButtonVisibility() {
        const randomBtn = document.getElementById('random-idea-btn');
        if (randomBtn) {
            randomBtn.style.display = 'inline-flex';
            
            if (categorySelect.value && audienceSelect.value) {
                // Both selected - normal styling
                randomBtn.style.opacity = '1';
                randomBtn.style.cursor = 'pointer';
            } else {
                // Not both selected - lighter gray styling
                randomBtn.style.opacity = '0.6';
                randomBtn.style.cursor = 'pointer';
            }
        }
    }
    
    if (categorySelect) categorySelect.addEventListener('change', checkRandomButtonVisibility);
    if (audienceSelect) audienceSelect.addEventListener('change', checkRandomButtonVisibility);
    
    // Make sure button is visible on page load
    checkRandomButtonVisibility();

    // Word count updates
    const topic = document.getElementById('topic');
    const styleDirection = document.getElementById('style-direction');
    if (topic) topic.addEventListener('input', updateWordCount);
    if (styleDirection) styleDirection.addEventListener('input', updateWordCount);
    
    // Feedback mode change listeners (removed as Advanced Settings sections were removed)

    // Project selector change listener
    const projectSelect = document.getElementById('project-select');
    if (projectSelect) {
        projectSelect.addEventListener('change', function() {
            updateDeleteButtonVisibility();
        });
    }

    // Custom donation amount handling
    const customAmountInput = document.getElementById('custom-donation-amount');
    if (customAmountInput) {
        customAmountInput.addEventListener('input', function() {
            if (this.value) {
                document.querySelectorAll('.donation-amount').forEach(btn => {
                    btn.classList.remove('selected');
                });
                
                document.getElementById('donate-btn').innerHTML = `<span class="label">Donate $${this.value}</span>`;
                selectedDonationAmount = parseFloat(this.value);
            }
        });
    }

    // Expand textarea word count tracking
    const expandTextarea = document.getElementById('expand-textarea');
    if (expandTextarea) {
        expandTextarea.addEventListener('input', updateExpandedWordCount);
    }
}

// ==================================================
// FEEDBACK SYSTEM
// ==================================================

/**
 * Toggle manual feedback input visibility
 * @param {string} step - Step identifier
 */
function toggleManualFeedback(step) {
    const modeEl = document.getElementById(`${step}-feedback-mode`);
    const manualSection = document.getElementById(`${step}-manual-feedback`);
    
    if (modeEl && manualSection) {
        const mode = modeEl.value;
        manualSection.style.display = mode === 'manual' ? 'block' : 'none';
    }
}

/**
 * Run feedback loop for content improvement
 * @param {string} contentType - Type of content to improve
 */
async function runFeedbackLoop(contentType) {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    
    isGenerating = true;
    showGenerationInfo(`Running ${contentType} feedback analysis...`);
    
    try {
        // Check if feedback elements exist (they may have been removed)
        const feedbackLoopsEl = document.getElementById(`${contentType}-feedback-loops`);
        const feedbackModeEl = document.getElementById(`${contentType}-feedback-mode`);
        
        if (!feedbackLoopsEl || !feedbackModeEl) {
            console.log(`Feedback elements for ${contentType} not found. Skipping feedback loop.`);
            return;
        }
        
        const feedbackLoops = parseInt(feedbackLoopsEl.value);
        if (feedbackLoops === 0) return;

        const feedbackMode = feedbackModeEl.value;
        let content = getContentForFeedback(contentType);

        if (!content) {
            await customAlert(`No ${contentType} content to analyze. Please generate content first.`, 'No Content');
            return;
        }

        // Get manual feedback if in manual mode
        let manualFeedback = '';
        if (feedbackMode === 'manual') {
            const manualInputEl = document.getElementById(`${contentType}-manual-input`);
            if (manualInputEl) {
                manualFeedback = manualInputEl.value;
                if (!manualFeedback.trim()) {
                    await customAlert('Please provide manual feedback instructions before running the feedback loop.', 'Missing Feedback');
                    return;
                }
            }
        }

        // Run feedback loops
        const feedbackModel = getSelectedModel('feedback');
        
        for (let i = 0; i < feedbackLoops; i++) {
            showGenerationInfo(`Running ${feedbackMode} feedback loop ${i + 1} of ${feedbackLoops}...`);
            
            let improvedContent;
            
            if (feedbackMode === 'manual') {
                improvedContent = await runManualFeedback(contentType, content, manualFeedback, feedbackModel);
            } else {
                improvedContent = await runAIFeedback(contentType, content, feedbackModel);
            }
            
            content = improvedContent;
            updateContentAfterFeedback(contentType, improvedContent);
            autoSave();
        }
        
    } catch (error) {
        await customAlert(`Error in feedback loop: ${error.message}`, 'Feedback Error');
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}

/**
 * Get content for feedback analysis
 * @param {string} contentType - Type of content
 * @returns {string} Content text
 */
function getContentForFeedback(contentType) {
    switch(contentType) {
        case 'blueprint':
            return bookData.blueprint;
        case 'sections':
            return bookData.sectionOutline;
        case 'writing':
            return bookData.sections.filter(c => c).join('\n\n---\n\n');
        default:
            return '';
    }
}

/**
 * Update content after feedback improvement
 * @param {string} contentType - Type of content
 * @param {string} improvedContent - Improved content
 */
function updateContentAfterFeedback(contentType, improvedContent) {
    switch(contentType) {
        case 'blueprint':
            bookData.blueprint = improvedContent;
            const outlineContent = document.getElementById('blueprint-content');
            if (outlineContent) {
                outlineContent.value = improvedContent;
                saveBlueprintContent();
            }
            break;
        case 'sections':
            bookData.sectionOutline = improvedContent;
            const sectionsContent = document.getElementById('outline-content');
            if (sectionsContent) {
                sectionsContent.value = improvedContent;
                saveOutlineContent();
            }
            break;
        case 'writing':
            // For writing feedback, this would need more complex handling
            // This is simplified for the current implementation
            break;
    }
}

// ==================================================
// AI API FUNCTIONS
// ==================================================

/**
 * Make API call to AI service
 * @param {string} prompt - User prompt
 * @param {string} systemPrompt - System prompt
 * @param {string} model - Model to use
 * @returns {Promise<string>} AI response
 */
async function callAI(prompt, systemPrompt = "", model = null, retryCount = 0) {
    const settings = getAISettings(model);
    const maxRetries = 3;
    
    if (!settings.apiKey) {
        throw new Error('Please enter your API key in the AI Settings page.');
    }

    const messages = [
        {
            role: "user",
            content: prompt
        }
    ];

    if (systemPrompt) {
        messages.unshift({
            role: "system",
            content: systemPrompt
        });
    }

    let apiUrl, headers, body;
    
    if (settings.apiProvider === 'openrouter') {
        apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
        headers = {
            'Authorization': `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://bookforge.ai',
            'X-Title': 'BookForge',
        };
        body = {
            model: settings.model,
            messages: messages,
            temperature: settings.temperature,
            max_tokens: settings.maxTokens
        };
    } else {
        apiUrl = 'https://api.openai.com/v1/chat/completions';
        headers = {
            'Authorization': `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json'
        };
        
        const isGPT5 = settings.model.includes('gpt-5');
        body = {
            model: settings.model,
            messages: messages,
            temperature: settings.temperature
        };
        
        if (isGPT5) {
            body.max_completion_tokens = settings.maxTokens;
        } else {
            body.max_tokens = settings.maxTokens;
        }
    }

    try {
        console.log('Making API request to:', apiUrl);
        console.log('Request headers:', headers);
        console.log('Request body:', JSON.stringify(body, null, 2));
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });
        
        console.log('API response status:', response.status);

        if (!response.ok) {
            let errorMessage = `API Error: ${response.status}`;
            try {
                const errorData = await response.text();
                const error = JSON.parse(errorData);
                errorMessage = error.error?.message || errorMessage;
            } catch (parseError) {
                // If we can't parse the error response, use the status
                console.warn('Failed to parse error response:', parseError);
            }
            
            // Retry on server errors (5xx) or rate limits (429)
            if ((response.status >= 500 || response.status === 429) && retryCount < maxRetries) {
                const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                console.log(`Retrying API call after ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return await callAI(prompt, systemPrompt, model, retryCount + 1);
            }
            
            throw new Error(errorMessage);
        }

        let data;
        try {
            const responseText = await response.text();
            console.log('Raw API response text:', responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse API response as JSON:', parseError);
            console.error('Raw response text that failed to parse:', responseText);
            
            // Retry on JSON parse errors
            if (retryCount < maxRetries) {
                const delay = Math.pow(2, retryCount) * 1000;
                console.log(`Retrying API call due to JSON parse error after ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return await callAI(prompt, systemPrompt, model, retryCount + 1);
            }
            
            throw new Error(`Invalid JSON response from API: ${parseError.message}`);
        }

        // Validate response structure
        if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
            if (retryCount < maxRetries) {
                const delay = Math.pow(2, retryCount) * 1000;
                console.log(`Retrying API call due to invalid response structure after ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return await callAI(prompt, systemPrompt, model, retryCount + 1);
            }
            throw new Error('Invalid API response structure: missing choices array');
        }
        
        if (!data.choices[0].message || !data.choices[0].message.content) {
            if (retryCount < maxRetries) {
                const delay = Math.pow(2, retryCount) * 1000;
                console.log(`Retrying API call due to missing message content after ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return await callAI(prompt, systemPrompt, model, retryCount + 1);
            }
            throw new Error('Invalid API response structure: missing message content');
        }

        const content = data.choices[0].message.content;
        console.log('API request successful, content length:', content.length);
        return content;
    } catch (error) {
        if (retryCount < maxRetries && (error.name === 'TypeError' || error.message.includes('fetch'))) {
            const delay = Math.pow(2, retryCount) * 1000;
            console.log(`Retrying API call due to network error after ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return await callAI(prompt, systemPrompt, model, retryCount + 1);
        }
        
        throw new Error(`API call failed: ${error.message}`);
    }
}

/**
 * Get AI settings for API call
 * @param {string} model - Optional specific model
 * @returns {Object} AI settings
 */
function getAISettings(model = null) {
    const provider = aiSettings.apiProvider;
    let apiKey = '';
    
    if (provider === 'openrouter') {
        apiKey = document.getElementById('openrouter-api-key')?.value || aiSettings.openrouterApiKey || '';
    } else {
        apiKey = document.getElementById('openai-api-key')?.value || aiSettings.openaiApiKey || '';
    }

    const selectedModel = model || document.getElementById('model-select')?.value || aiSettings.model || 'anthropic/claude-sonnet-4';
    
    return {
        apiProvider: provider,
        apiKey: apiKey,
        model: selectedModel,
        temperature: parseFloat(document.getElementById('temperature')?.value || aiSettings.temperature),
        maxTokens: parseInt(document.getElementById('max-tokens')?.value || aiSettings.maxTokens)
    };
}

/**
 * Format prompt template with replacements
 * @param {string} template - Prompt template
 * @param {Object} replacements - Replacement values
 * @returns {string} Formatted prompt
 */
function formatPrompt(template, replacements) {
    let formatted = template;
    for (const [key, value] of Object.entries(replacements)) {
        const regex = new RegExp(`{${key}}`, 'g');
        formatted = formatted.replace(regex, value || '');
    }
    return formatted;
}

// ==================================================
// ADVANCED MODEL SELECTION
// ==================================================

/**
 * Get selected model for specific step
 * @param {string} step - Generation step
 * @returns {string} Model identifier
 */
function getSelectedModel(step) {
    if (!step) {
        return document.getElementById('model-select')?.value || aiSettings.model || 'anthropic/claude-sonnet-4';
    }
    
    const checkbox = document.getElementById('enable-advanced-models');
    const advancedModelsEnabled = checkbox ? checkbox.checked : false;
    
    if (advancedModelsEnabled && aiSettings && aiSettings.advancedModels && aiSettings.advancedModels[step]) {
        return aiSettings.advancedModels[step];
    }
    
    return document.getElementById('model-select')?.value || aiSettings.model || 'anthropic/claude-sonnet-4';
}

/**
 * Save advanced model settings
 */
function saveAdvancedModelSettings() {
    const advancedModels = {};
    
    ['blueprint', 'sections', 'writing', 'feedback', 'randomIdea'].forEach(step => {
        const select = document.getElementById(`advanced-model-${step}`);
        if (select && select.value) {
            advancedModels[step] = select.value;
        }
    });
    
    aiSettings.advancedModels = advancedModels;
    aiSettings.advancedModelsEnabled = document.getElementById('enable-advanced-models')?.checked || false;
    
    saveSettings();
}

/**
 * Reset advanced model settings to defaults
 */
function resetAdvancedModelSettings() {
    ['blueprint', 'sections', 'writing', 'feedback', 'randomIdea'].forEach(step => {
        const select = document.getElementById(`advanced-model-${step}`);
        if (select) {
            select.value = '';
        }
    });
    
    const checkbox = document.getElementById('enable-advanced-models');
    if (checkbox) {
        checkbox.checked = false;
    }
    
    aiSettings.advancedModels = {};
    aiSettings.advancedModelsEnabled = false;
    saveSettings();
    
    updateAdvancedModelsVisualState();
}

/**
 * Update visual state of advanced models section
 */
function updateAdvancedModelsVisualState() {
    const checkbox = document.getElementById('enable-advanced-models');
    const selects = document.querySelectorAll('[id^="advanced-model-"]');
    const statusElement = document.getElementById('advanced-models-status');
    const expandableSection = document.getElementById('advanced-models-expandable');
    
    if (checkbox) {
        const isEnabled = checkbox.checked;
        
        // Update model selects
        selects.forEach(select => {
            select.disabled = !isEnabled;
            select.style.opacity = isEnabled ? '1' : '0.5';
        });
        
        // Update status text and styling
        if (statusElement) {
            statusElement.textContent = isEnabled ? 'Enabled' : 'Disabled';
            statusElement.classList.toggle('enabled', isEnabled);
        }
        
        // Show/hide expandable section with animation
        if (expandableSection) {
            if (isEnabled) {
                expandableSection.style.display = 'block';
                // Trigger animation by adding class after display
                setTimeout(() => {
                    expandableSection.classList.add('expanded');
                }, 10);
            } else {
                expandableSection.classList.remove('expanded');
                // Hide after animation completes
                setTimeout(() => {
                    if (!checkbox.checked) { // Double-check state hasn't changed
                        expandableSection.style.display = 'none';
                    }
                }, 300);
            }
        }
    }
}

/**
 * Update model select dropdowns
 */
function updateModelSelect() {
    updateMainModelSelect();
    updateAdvancedModelSelects();
}

/**
 * Update main model selection dropdown
 */
function updateMainModelSelect() {
    const modelSelect = document.getElementById('model-select');
    if (!modelSelect) return;
    
    modelSelect.innerHTML = '';
    const provider = aiSettings.apiProvider || 'openrouter';
    const models = apiModels[provider];

    if (!models) return;

    function createOptions(modelArray, groupLabel) {
        if (!modelArray || modelArray.length === 0) return;
        
        const group = document.createElement('optgroup');
        group.label = groupLabel;
        
        modelArray.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.label;
            
            if (model.cost) {
                option.title = `Input: $${model.cost.input}/1M tokens | Output: $${model.cost.output}/1M tokens`;
            }
            
            if (aiSettings.model === model.value) {
                option.selected = true;
            }
            
            group.appendChild(option);
        });
        
        modelSelect.appendChild(group);
    }

    if (models.Recommended && models.Recommended.length) {
        createOptions(models.Recommended, 'Recommended Models');
    }

    if (models.More && models.More.length) {
        createOptions(models.More, 'More Models');
    }

    updateModelInfo();
}

/**
 * Update advanced model selection dropdowns
 */
function updateAdvancedModelSelects() {
    ['blueprint', 'sections', 'writing', 'feedback', 'randomIdea'].forEach(step => {
        updateAdvancedModelSelect(`advanced-model-${step}`);
    });
    
    // Load saved advanced model settings
    loadSavedAdvancedModels();
    updateAdvancedModelsVisualState();
}

/**
 * Update individual advanced model select
 * @param {string} selectId - Select element ID
 */
function updateAdvancedModelSelect(selectId) {
    const modelSelect = document.getElementById(selectId);
    if (!modelSelect) return;
    
    const provider = aiSettings.apiProvider || 'openrouter';
    const models = apiModels[provider];
    if (!models) return;

    modelSelect.innerHTML = '';

    // Add empty option first
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Use Default Model';
    emptyOption.style.fontStyle = 'italic';
    modelSelect.appendChild(emptyOption);

    function createOptions(modelArray, groupLabel) {
        if (!modelArray || modelArray.length === 0) return;
        
        const group = document.createElement('optgroup');
        group.label = groupLabel;
        
        modelArray.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.label;
            
            if (model.cost) {
                option.title = `Input: $${model.cost.input}/1M tokens | Output: $${model.cost.output}/1M tokens`;
            }
            
            group.appendChild(option);
        });
        
        modelSelect.appendChild(group);
    }

    if (models.Recommended && models.Recommended.length) {
        createOptions(models.Recommended, 'Recommended');
    }

    if (models.More && models.More.length) {
        createOptions(models.More, 'More');
    }
}

/**
 * Load saved advanced model settings
 */
function loadSavedAdvancedModels() {
    if (!aiSettings.advancedModels) return;
    
    const checkbox = document.getElementById('enable-advanced-models');
    if (checkbox) {
        checkbox.checked = aiSettings.advancedModelsEnabled || false;
    }
    
    Object.entries(aiSettings.advancedModels).forEach(([step, model]) => {
        const select = document.getElementById(`advanced-model-${step}`);
        if (select) {
            const isAvailable = Array.from(select.options).some(option => option.value === model);
            if (isAvailable) {
                select.value = model;
            } else {
                delete aiSettings.advancedModels[step];
            }
        }
    });
}

/**
 * Switch API provider
 * @param {string} provider - Provider name
 */
function switchApiProvider(provider) {
    aiSettings.apiProvider = provider;
    
    // Update toggle buttons
    const openrouterBtn = document.getElementById('openrouter-btn');
    const openaiBtn = document.getElementById('openai-btn');
    
    if (openrouterBtn && openaiBtn) {
        openrouterBtn.classList.toggle('active', provider === 'openrouter');
        openaiBtn.classList.toggle('active', provider === 'openai');
    }
    
    // Show/hide appropriate API key fields
    const openrouterGroup = document.getElementById('openrouter-key-group');
    const openaiGroup = document.getElementById('openai-key-group');
    
    if (openrouterGroup && openaiGroup) {
        if (provider === 'openrouter') {
            openrouterGroup.style.display = 'block';
            openaiGroup.style.display = 'none';
        } else {
            openrouterGroup.style.display = 'none';
            openaiGroup.style.display = 'block';
        }
    }
    
    updateModelSelect();
    saveSettings();
}

// ==================================================
// RANDOM IDEA GENERATION
// ==================================================

/**
 * Generate random book idea based on genre and audience
 */
async function generateRandomIdea() {
    const randomBtn = document.getElementById('random-idea-btn');

    if (isGenerating) {
        showGenerationInfo("Please wait until the current generation is finished...");
        return;
    }

    const genre = document.getElementById('category').value;
    const audience = document.getElementById('target-audience').value;

    if (!genre || !audience) {
        await customAlert('Please select category and target audience first!', 'Missing Information');
        return;
    }

    isGenerating = true;
    showGenerationInfo("AI is generating your unique book idea...");
    randomBtn.disabled = true;

    try {
        const selectedModel = getSelectedModel('randomIdea');
        
        const prompt = formatPrompt(aiSettings.customPrompts.randomIdea || defaultPrompts.randomIdea, {
            genre: genre.replace('-', ' '),
            targetAudience: audience.replace('-', ' ')
        });

        const aiResponse = await callAI(prompt, "You are a master non-fiction author and creative genius specializing in generating original, bestselling book concepts.", selectedModel);
        
        // Parse the AI response
        const lines = aiResponse.split('\n');
        let premise = '';
        let style = '';
        let sections = '20';

        for (const line of lines) {
            if (line.startsWith('PREMISE:')) {
                premise = line.replace('PREMISE:', '').trim();
            } else if (line.startsWith('STYLE:')) {
                style = line.replace('STYLE:', '').trim();
            } else if (line.startsWith('CHAPTERS:')) {
                sections = line.replace('CHAPTERS:', '').trim().match(/\d+/)?.[0] || '20';
            }
        }

        // Fallback parsing if structured format not found
        if (!premise || !style) {
            const paragraphs = aiResponse.split('\n\n');
            if (paragraphs.length >= 2) {
                premise = premise || paragraphs[0];
                style = style || paragraphs[1];
            } else {
                premise = aiResponse;
                style = "Engaging and well-paced narrative style appropriate for the target audience";
            }
        }

        // Update form fields
        document.getElementById('topic').value = premise;
        document.getElementById('style-direction').value = style;
        document.getElementById('num-sections').value = sections;
        
        updateWordCount();
        updateSectionEstimate();
        autoSave();

        isGenerating = false;
        hideGenerationInfo();
        randomBtn.disabled = false;

        await customAlert('Unique book idea generated by AI! Review and modify as needed, then click "Start Creating Book" when ready.', 'Idea Generated');

    } catch (error) {
        isGenerating = false;
        hideGenerationInfo();
        randomBtn.disabled = false;
        
        await customAlert(`Error generating random idea: ${error.message}`, 'Generation Error');
    }
}

// ==================================================
// BOOK GENERATION FUNCTIONS
// ==================================================

/**
 * Collect book data from form fields
 */
function collectBookData() {
    bookData.category = document.getElementById('category').value;
    bookData.targetAudience = document.getElementById('target-audience').value;
    bookData.topic = document.getElementById('topic').value;
    bookData.styleDirection = document.getElementById('style-direction').value;
    bookData.styleExample = document.getElementById('style-example').value;
    bookData.numSections = parseInt(document.getElementById('num-sections').value) || 20;
    bookData.targetWordCount = parseInt(document.getElementById('target-word-count').value) || 2000;
    
    const currentStep = document.querySelector('.step.active')?.id;
    if (currentStep) {
        bookData.currentStep = currentStep;
    }
    
    bookData.lastSaved = new Date().toISOString();
}

/**
 * Generate book blueprint
 */
async function generateBlueprint() {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    
    // Save state for undo before generating
    saveStateForUndo('Generate Book Blueprint');
    
    isGenerating = true;
    showGenerationInfo("Generating complete book blueprint...");

    try {
        collectBookData();
        
        const categoryReq = categoryRequirements[bookData.category] || { requirements: '', guidelines: '' };
        const categoryRequirementsText = `${categoryReq.requirements}\nGuidelines: ${categoryReq.guidelines}`;

        const selectedModel = getSelectedModel('blueprint');

        const promptEl = null; // No step-specific prompt element for blueprint
        const prompt = formatPrompt(promptEl ? promptEl.value : (aiSettings.customPrompts?.blueprint || defaultPrompts.blueprint), {
            category: bookData.category,
            targetAudience: bookData.targetAudience,
            topic: bookData.topic,
            styleDirection: bookData.styleDirection,
            numSections: bookData.numSections,
            categoryRequirements: categoryRequirementsText
        });

        const outline = await callAI(prompt, "You are a master non-fiction author and bestselling author creating commercially successful book blueprints.", selectedModel);
        
        // Extract title and blurb from the book blueprint
        const titleMatch = outline.match(/\*\*Book Title:\*\*\s*(.+?)(?:\n|\*\*)/i);
        const blurbMatch = outline.match(/\*\*Book Blurb:\*\*\s*((?:.|\n)*?)(?=\n##|\n\*\*[^B]|$)/i);
        
        bookData.title = titleMatch ? titleMatch[1].trim().replace(/["']/g, '') : extractFirstSentence(bookData.topic);
        bookData.blurb = blurbMatch ? blurbMatch[1].trim() : bookData.topic;
        
        const outlineTextarea = document.getElementById('blueprint-content');
        if (outlineTextarea) {
            outlineTextarea.value = outline;
            saveBlueprintContent();
        }
        

    } catch (error) {
        await customAlert(`Error generating book blueprint: ${error.message}`, 'Generation Error');
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}

/**
 * Regenerate book blueprint
 */
async function regenerateBlueprint() {
    await generateBlueprint();
}

/**
 * Proceed to sections step
 */
function proceedToOutline() {
    showStep('outline');
}

/**
 * Generate section outline
 */
async function generateSectionOutline() {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    
    // Save state for undo before generating
    saveStateForUndo('Generate Section Outline');
    
    isGenerating = true;
    showGenerationInfo("Creating detailed section outline with learning objectives...");

    try {
        const selectedModel = getSelectedModel('sections');
        
        const promptEl = document.getElementById('outline-prompt');
        const prompt = formatPrompt(promptEl ? promptEl.value : (aiSettings.customPrompts?.outline || defaultPrompts.outline), {
            blueprint: bookData.blueprint,
            category: bookData.category,
            targetAudience: bookData.targetAudience,
            numSections: bookData.numSections,
            targetWordCount: bookData.targetWordCount
        });

        const sectionOutline = await callAI(prompt, "You are a master non-fiction author creating detailed section breakdowns for commercially successful non-fiction books.", selectedModel);
        
        const sectionsTextarea = document.getElementById('outline-content');
        if (sectionsTextarea) {
            sectionsTextarea.value = sectionOutline;
            saveOutlineContent();
        }
        

    } catch (error) {
        await customAlert(`Error generating section outline: ${error.message}`, 'Generation Error');
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}

/**
 * Regenerate section outline
 */
async function regenerateSectionOutline() {
    await generateSectionOutline();
}

/**
 * Extract first sentence from text
 * @param {string} text - Input text
 * @returns {string} First sentence
 */
function extractFirstSentence(text) {
    const sentences = text.split(/[.!?]+/);
    return sentences[0]?.trim() || text.substring(0, 50);
}

/**
 * Proceed to writing step
 */
function proceedToWriting() {
    showStep('writing');
}

// ==================================================
// CONTENT HANDLERS
// ==================================================

/**
 * Save outline content and update UI
 */
function saveBlueprintContent() {
    const textarea = document.getElementById('blueprint-content');
    if (!textarea) return;
    
    bookData.blueprint = textarea.value;
    
    const wordCount = countWords(textarea.value);
    const wordCountEl = document.getElementById('outline-word-count');
    if (wordCountEl) {
        wordCountEl.textContent = `${wordCount} words`;
    }
    
    const nextBtn = document.getElementById('blueprint-next');
    if (nextBtn) {
        nextBtn.style.display = textarea.value.trim() ? 'inline-flex' : 'none';
    }
    
    autoSave();
}

/**
 * Save sections content and update UI
 */
function saveOutlineContent() {
    const textarea = document.getElementById('outline-content');
    if (!textarea) return;
    
    bookData.sectionOutline = textarea.value;
    
    const wordCount = countWords(textarea.value);
    const wordCountEl = document.getElementById('sections-word-count');
    if (wordCountEl) {
        wordCountEl.textContent = `${wordCount} words`;
    }
    
    const nextBtn = document.getElementById('outline-next');
    if (nextBtn) {
        nextBtn.style.display = textarea.value.trim() ? 'inline-flex' : 'none';
    }
    
    autoSave();
}

/**
 * Clear outline content with confirmation
 */
async function clearBlueprintContent() {
    const confirmed = await customConfirm('Are you sure you want to clear the book blueprint content?', 'Clear Content');
    if (confirmed) {
        const textarea = document.getElementById('blueprint-content');
        if (textarea) {
            textarea.value = '';
            saveOutlineContent();
        }
    }
}

/**
 * Clear sections content with confirmation
 */
async function clearOutlineContent() {
    const confirmed = await customConfirm('Are you sure you want to clear the section outline content?', 'Clear Content');
    if (confirmed) {
        const textarea = document.getElementById('outline-content');
        if (textarea) {
            textarea.value = '';
            saveOutlineContent();
        }
    }
}

// ==================================================
// WRITING INTERFACE
// ==================================================

/**
 * Set up the writing interface with section management
 * - Per-section collapse icons are added to each section card header
 * - Collapse/expand toggles work per section
 * - No global "Collapse Sections" button
 */
function setupWritingInterface() {
    const container = document.getElementById('sections-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Ensure numSections is valid
    if (!bookData.numSections || bookData.numSections < 1) {
        bookData.numSections = 20; // Default value
    }
    
    // Ensure sections array is properly sized
    if (!bookData.sections) {
        bookData.sections = [];
    }
    bookData.sections = Array(bookData.numSections).fill(null).map((_, i) => bookData.sections[i] || '');

    // Add primary generation actions section (similar to book blueprint and section outline)
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'primary-actions-section';
    actionsDiv.innerHTML = `
        <div class="main-generation-actions">
            <button class="btn btn-primary btn-large" onclick="generateAllSections()">
                <span class="label">Generate All Sections</span>
            </button>
            <button class="btn btn-primary" onclick="generateSelectedSections()" id="generate-selected-btn" disabled>
                <span class="label">Generate Selected (0)</span>
            </button>
        </div>
        <p class="writing-hint">Tip: Type directly in section fields or use AI generation. Select multiple sections for batch processing.</p>
    `;
    container.appendChild(actionsDiv);

    // Create section items
    for (let i = 1; i <= bookData.numSections; i++) {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'section-item';
        sectionDiv.innerHTML = `
            <div class="section-header" aria-label="Section ${i} header">
                <button class="collapse-section-btn" onclick="toggleSectionCollapse(${i})" title="Collapse/Expand Section" aria-label="Collapse/Expand Section">
                    <i class="fas fa-angle-down"></i>
                </button>
                <div class="section-info">
                    <div class="section-checkbox">
                        <input type="checkbox" id="section-${i}-checkbox" onchange="updateGenerateSelectedButton()">
                        <label for="section-${i}-checkbox" class="checkbox-label">
                            <h4>Section ${i}</h4>
                        </label>
                    </div>
                    <div class="section-word-count" id="section-${i}-word-count">0 words</div>
                </div>
                <div class="section-actions" style="display:flex; align-items:center; gap:6px;">
                    <button class="btn btn-primary btn-sm" onclick="generateSingleSection(${i})" id="section-${i}-generate-btn">
                        <span class="label">Generate</span>
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="showSectionEditModal(${i})">
                        <span class="label">Edit</span>
                    </button>
                </div>
            </div>
            
            <div class="section-content-field" id="section-${i}-content-field" style="display: block; padding-top: 8px;">
                <div class="form-group">
                    <div class="line-editing-controls" style="margin-bottom: 8px;">
                        <div class="line-edit-buttons">
                            <button class="btn btn-ghost btn-sm" onclick="continueWriting(${i})" title="Continue writing from cursor position (~200-300 words)">
                                <i class="fas fa-arrow-right"></i> Continue
                            </button>
                            <button class="btn btn-ghost btn-sm" onclick="rewriteSelection(${i})" title="Rewrite selected paragraph with context awareness">
                                <i class="fas fa-edit"></i> Rewrite
                            </button>
                            <button class="btn btn-ghost btn-sm" onclick="expandSelection(${i})" title="Expand selected paragraph with more details">
                                <i class="fas fa-expand-arrows-alt"></i> Expand
                            </button>
                        </div>
                        <div class="line-edit-hint">Select text for rewrite/expand options, or place cursor for continue</div>
                    </div>
                    <div class="textarea-container">
                        <textarea 
                            id="section-${i}-content" 
                            class="section-textarea" 
                            placeholder="Type your section content here or use AI generation above..." 
                            rows="15"
                            oninput="updateSectionContent(${i})"></textarea>
                    </div>
                </div>
            </div>

            <div class="section-status" id="section-${i}-status"></div>
        `;
        container.appendChild(sectionDiv);
    }

    // Load existing section content
    for (let i = 1; i <= bookData.numSections; i++) {
        if (bookData.sections[i - 1]) {
            document.getElementById(`section-${i}-content`).value = bookData.sections[i - 1];
            updateSectionContent(i);
        }
    }

    updateOverallProgress();
}

/**
 * Update section content and word count
 * @param {number} sectionNum - Section number
 */
function updateSectionContent(sectionNum) {
    const textarea = document.getElementById(`section-${sectionNum}-content`);
    const content = textarea.value;
    
    bookData.sections[sectionNum - 1] = content;
    
    const wordCount = countWords(content);
    document.getElementById(`section-${sectionNum}-word-count`).textContent = `${wordCount} words`;
    
    updateOverallProgress();
    autoSave();
}

// New: Per-section collapse toggle
/**
 * Toggle a single section content visibility
 * @param {number} sectionNum
 */
function toggleSectionContent(sectionNum) {
    const field = document.getElementById(`section-${sectionNum}-content-field`);
    if (!field) return;
    // Simple toggle
    if (field.style.display === 'none') {
        field.style.display = 'block';
    } else {
        field.style.display = 'none';
    }
    // Optional: rotate the icon (not strictly necessary for functionality)
    const iconBtn = document.querySelector(`#section-${sectionNum}-content-field ~ .collapse-section-btn`);
    // If icon rotation needed, implement here
}

/**
 * Toggle individual section collapse
 */
function toggleSectionCollapse(sectionNum) {
    const contentField = document.getElementById(`section-${sectionNum}-content-field`);
    const collapseBtn = document.querySelector(`button[onclick="toggleSectionCollapse(${sectionNum})"]`);
    
    if (!contentField) {
        console.warn(`Content field not found for section ${sectionNum}. Make sure you're on the Writing tab and sections are initialized.`);
        return;
    }
    
    // Toggle the collapsed class
    contentField.classList.toggle('collapsed');
    
    // Update the button icon
    if (collapseBtn) {
        const icon = collapseBtn.querySelector('i');
        if (icon) {
            if (contentField.classList.contains('collapsed')) {
                icon.className = 'fas fa-angle-right';
            } else {
                icon.className = 'fas fa-angle-down';
            }
        }
    }
}

//（Continuing existing per-section save flow; updated to avoid Event reliance）
// Replace previous saveSectionContent to be robust and not rely on event

/**
 * Save section content with visual feedback
 * @param {number} sectionNum - Section number
 */
function saveSectionContent(sectionNum) {
    const textarea = document.getElementById(`section-${sectionNum}-content`);
    bookData.sections[sectionNum - 1] = textarea.value;
    
    const btn = document.getElementById(`section-${sectionNum}-save-btn`);
    if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="label">Saved!</span>';
        btn.style.background = 'var(--color-success)';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
        }, 1200);
    }
    
    updateSectionContent(sectionNum);
}

/**
 * Clear section content with confirmation
 * @param {number} sectionNum - Section number
 */
async function clearSectionContent(sectionNum) {
    const confirmed = await customConfirm(`Are you sure you want to clear Section ${sectionNum} content?`, 'Clear Content');
    if (confirmed) {
        document.getElementById(`section-${sectionNum}-content`).value = '';
        updateSectionContent(sectionNum);
    }
}

/**
 * Generate single section
 * @param {number} sectionNum - Section number
 */
async function generateSingleSection(sectionNum) {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    
    // Save state for undo before generating
    saveStateForUndo(`Generate Section ${sectionNum}`);
    
    isGenerating = true;
    showGenerationInfo(`Writing Section ${sectionNum}...`);
    
    document.getElementById(`section-${sectionNum}-status`).innerHTML = '<div class="loading"><div class="spinner"></div>Writing...</div>';
    document.getElementById(`section-${sectionNum}-generate-btn`).disabled = true;

    try {
        const sectionContent = await writeSection(sectionNum);
        
        document.getElementById(`section-${sectionNum}-content`).value = sectionContent;
        updateSectionContent(sectionNum);
        
        document.getElementById(`section-${sectionNum}-status`).innerHTML = 'Generated successfully';
        
    } catch (error) {
        document.getElementById(`section-${sectionNum}-status`).innerHTML = `Error: ${error.message}`;
    } finally {
        document.getElementById(`section-${sectionNum}-generate-btn`).disabled = false;
        isGenerating = false;
        hideGenerationInfo();
    }
}

/**
 * Write section content using AI
 * @param {number} sectionNum - Section number
 * @returns {Promise<string>} Generated section content
 */
async function writeSection(sectionNum) {
    try {
        let previousSectionEnding = '';
        if (sectionNum > 1 && bookData.sections[sectionNum - 2]) {
            const prevSection = bookData.sections[sectionNum - 2];
            const words = prevSection.split(' ');
            previousSectionEnding = words.slice(-500).join(' ');
        }

        const categoryReq = categoryRequirements[bookData.category] || { requirements: '', guidelines: '' };
        const categorySpecificElements = `Category Requirements: ${categoryReq.requirements}\nContent Guidelines: ${categoryReq.guidelines}`;

        const contextInfo = `
BOOK SETUP:
- Genre: ${bookData.category}
- Target Audience: ${bookData.targetAudience}
- Premise: ${bookData.topic}
- Style Direction: ${bookData.styleDirection}

COMPLETE STORY BIBLE:
${bookData.blueprint}

DETAILED CHAPTER OUTLINE:
${bookData.sectionOutline}
        `;

        const sectionOutline = extractSectionOutline(bookData.sectionOutline, sectionNum);
        const selectedModel = getSelectedModel('writing');

        // Add style excerpt section if provided
        const styleExcerptSection = bookData.styleExample ? 
`CRITICAL: WRITING STYLE EXAMPLE (EMULATE THIS STYLE HEAVILY):

The following excerpt demonstrates the EXACT writing style, voice, tone, and prose structure you must emulate. Pay close attention to:
- Sentence structure and rhythm
- Word choice and vocabulary level  
- Dialogue style and character voice
- Descriptive language and imagery
- Pacing and flow

STYLE EXAMPLE TO EMULATE:
"${bookData.styleExample}"

**Write your section in this EXACT style. This is your highest priority - match this voice and prose style precisely.**

` : '';

        const promptEl = document.getElementById('writing-prompt');
        const prompt = formatPrompt(promptEl ? promptEl.value : (aiSettings.customPrompts?.writing || defaultPrompts.writing), {
            sectionNum: sectionNum,
            category: bookData.category,
            targetAudience: bookData.targetAudience,
            styleDirection: bookData.styleDirection,
            targetWordCount: bookData.targetWordCount,
            sectionOutline: sectionOutline,
            previousSectionEnding: previousSectionEnding,
            categorySpecificElements: categorySpecificElements,
            styleExcerptSection: styleExcerptSection
        });

        const sectionContent = await callAI(prompt, `You are a master non-fiction author writing professional ${bookData.category} content for ${bookData.targetAudience} readers.`, selectedModel);
        
        return sectionContent;

    } catch (error) {
        throw new Error(`Failed to write section ${sectionNum}: ${error.message}`);
    }
}

/**
 * Extract section outline from full outline
 * @param {string} fullOutline - Complete section outline
 * @param {number} sectionNum - Section number to extract
 * @returns {string} Section-specific outline
 */
function extractSectionOutline(fullOutline, sectionNum) {
    const lines = fullOutline.split('\n');
    const sectionLines = [];
    let capturing = false;
    
    for (const line of lines) {
        if (line.toLowerCase().includes(`section ${sectionNum}`)) {
            capturing = true;
            sectionLines.push(line);
        } else if (capturing && line.toLowerCase().match(/section \d+/)) {
            break;
        } else if (capturing) {
            sectionLines.push(line);
        }
    }
    
    return sectionLines.join('\n') || `Section ${sectionNum} outline not found in full outline.`;
}

// ==================================================
// LINE EDITING FUNCTIONS
// ==================================================

/**
 * Continue writing from cursor position
 * @param {number} sectionNum - Section number
 */
async function continueWriting(sectionNum) {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    
    // Save state for undo
    saveStateForUndo(`Continue Section ${sectionNum}`);
    
    const textarea = document.getElementById(`section-${sectionNum}-content`);
    if (!textarea) {
        await customAlert('Section textarea not found. Please try again.', 'Error');
        return;
    }
    
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPosition);
    const textAfterCursor = textarea.value.substring(cursorPosition);
    
    isGenerating = true;
    showGenerationInfo(`Continuing Section ${sectionNum} from cursor position...`);
    
    try {
        const contextBefore = textBeforeCursor.split(' ').slice(-500).join(' '); // Last 500 words
        const contextAfter = textAfterCursor.split(' ').slice(0, 500).join(' '); // Next 500 words
        
        const styleExcerptSection = bookData.styleExample ? 
`CRITICAL: WRITING STYLE TO MATCH:
"${bookData.styleExample}"
**Match this style exactly - voice, tone, sentence structure, vocabulary level.**

` : '';

        const prompt = `You are a master ${bookData.category} non-fiction author continuing a section mid-sentence or mid-paragraph.

BOOK CONTEXT:
- Genre: ${bookData.category}
- Target Audience: ${bookData.targetAudience}
- Style Direction: ${bookData.styleDirection}

CHAPTER ${sectionNum} CONTEXT:
- Complete Book Blueprint: ${bookData.blueprint}
- Section Outline: ${extractSectionOutline(bookData.sectionOutline, sectionNum)}

${styleExcerptSection}

CONTINUATION TASK:
Continue writing seamlessly from where the cursor is positioned. Write approximately 200-300 words that:

PRECEDING TEXT (for context):
"${contextBefore}"

FOLLOWING TEXT (to connect to):
"${textAfterCursor ? `"${contextAfter}"` : 'END OF CHAPTER'}"

REQUIREMENTS:
- Continue seamlessly from the preceding text
- Write in the established voice and style
- Advance the plot naturally according to the section outline
- Maintain character consistency
- Write 200-300 words of engaging, publishable prose
- If there's following text, ensure your continuation flows smoothly into it
- Match the category conventions for ${bookData.category}

Write the continuation only (no explanations or meta-text):`;

        const continuation = await callAI(prompt, `You are continuing a ${bookData.category} section with seamless narrative flow.`, getSelectedModel('writing'));
        
        // Insert the continuation at cursor position
        const newContent = textBeforeCursor + continuation + textAfterCursor;
        textarea.value = newContent;
        
        // Position cursor at end of inserted text
        const newCursorPosition = textBeforeCursor.length + continuation.length;
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
        
        updateSectionContent(sectionNum);
        
    } catch (error) {
        await customAlert(`Failed to continue writing: ${error.message}`, 'Continue Writing Error');
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}

/**
 * Rewrite selected text with context awareness
 * @param {number} sectionNum - Section number
 */
async function rewriteSelection(sectionNum) {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    
    const textarea = document.getElementById(`section-${sectionNum}-content`);
    if (!textarea) {
        await customAlert('Section textarea not found. Please try again.', 'Error');
        return;
    }
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start === end) {
        await customAlert('Please select text to rewrite first.', 'No Selection');
        return;
    }
    
    // Save state for undo
    saveStateForUndo(`Rewrite Selection Section ${sectionNum}`);
    
    const selectedText = textarea.value.substring(start, end);
    const textBefore = textarea.value.substring(0, start);
    const textAfter = textarea.value.substring(end);
    
    isGenerating = true;
    showGenerationInfo(`Rewriting selected text in Section ${sectionNum}...`);
    
    try {
        const contextBefore = textBefore.split(' ').slice(-500).join(' ');
        const contextAfter = textAfter.split(' ').slice(0, 500).join(' ');
        
        const styleExcerptSection = bookData.styleExample ? 
`CRITICAL: WRITING STYLE TO MATCH:
"${bookData.styleExample}"
**Match this style exactly - voice, tone, sentence structure, vocabulary level.**

` : '';

        const prompt = `You are a master ${bookData.category} editor improving a paragraph while maintaining story continuity.

BOOK CONTEXT:
- Genre: ${bookData.category}
- Target Audience: ${bookData.targetAudience}
- Style Direction: ${bookData.styleDirection}

CHAPTER ${sectionNum} CONTEXT:
- Complete Book Blueprint: ${bookData.blueprint}
- Section Outline: ${extractSectionOutline(bookData.sectionOutline, sectionNum)}

${styleExcerptSection}

REWRITING TASK:
Improve the following paragraph while maintaining perfect continuity with surrounding text:

PRECEDING TEXT:
"${contextBefore}"

TEXT TO REWRITE:
"${selectedText}"

FOLLOWING TEXT:
"${contextAfter}"

REQUIREMENTS:
- Improve the prose quality, clarity, and engagement
- Maintain the same story events and character actions
- Ensure smooth transition from preceding text
- Ensure smooth connection to following text
- Match the established voice and style
- Keep the same general paragraph length
- Enhance dialogue, descriptions, or action as appropriate

Provide only the improved paragraph (no explanations):`;

        const rewrittenText = await callAI(prompt, `You are improving ${bookData.category} prose while maintaining story continuity.`, getSelectedModel('writing'));
        
        // Replace selected text with rewritten version
        const newContent = textBefore + rewrittenText + textAfter;
        textarea.value = newContent;
        
        // Select the new text
        textarea.setSelectionRange(start, start + rewrittenText.length);
        
        updateSectionContent(sectionNum);
        
    } catch (error) {
        await customAlert(`Failed to rewrite selection: ${error.message}`, 'Rewrite Error');
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}

/**
 * Expand selected text with more details
 * @param {number} sectionNum - Section number
 */
async function expandSelection(sectionNum) {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }
    
    const textarea = document.getElementById(`section-${sectionNum}-content`);
    if (!textarea) {
        await customAlert('Section textarea not found. Please try again.', 'Error');
        return;
    }
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start === end) {
        await customAlert('Please select text to expand first.', 'No Selection');
        return;
    }
    
    // Save state for undo
    saveStateForUndo(`Expand Selection Section ${sectionNum}`);
    
    const selectedText = textarea.value.substring(start, end);
    const textBefore = textarea.value.substring(0, start);
    const textAfter = textarea.value.substring(end);
    
    isGenerating = true;
    showGenerationInfo(`Expanding selected text in Section ${sectionNum}...`);
    
    try {
        const contextBefore = textBefore.split(' ').slice(-500).join(' ');
        const contextAfter = textAfter.split(' ').slice(0, 500).join(' ');
        
        const styleExcerptSection = bookData.styleExample ? 
`CRITICAL: WRITING STYLE TO MATCH:
"${bookData.styleExample}"
**Match this style exactly - voice, tone, sentence structure, vocabulary level.**

` : '';

        const prompt = `You are a master ${bookData.category} writer expanding a paragraph with rich detail and depth.

BOOK CONTEXT:
- Genre: ${bookData.category}
- Target Audience: ${bookData.targetAudience}
- Style Direction: ${bookData.styleDirection}

CHAPTER ${sectionNum} CONTEXT:
- Complete Book Blueprint: ${bookData.blueprint}
- Section Outline: ${extractSectionOutline(bookData.sectionOutline, sectionNum)}

${styleExcerptSection}

EXPANSION TASK:
Take the following paragraph and expand it with rich details, deeper character insight, more vivid descriptions, and enhanced atmosphere while maintaining story continuity:

PRECEDING TEXT:
"${contextBefore}"

TEXT TO EXPAND:
"${selectedText}"

FOLLOWING TEXT:
"${contextAfter}"

REQUIREMENTS:
- Expand with sensory details, internal thoughts, dialogue, or environmental descriptions
- Maintain the same story events and character actions
- Add depth and richness without changing the plot
- Ensure smooth transition from preceding text
- Ensure smooth connection to following text
- Match the established voice and style
- Make it approximately 1.5-2x longer than original
- Enhance the emotional resonance and immersion

Provide only the expanded paragraph (no explanations):`;

        const expandedText = await callAI(prompt, `You are expanding ${bookData.category} prose with rich details and depth.`, getSelectedModel('writing'));
        
        // Replace selected text with expanded version
        const newContent = textBefore + expandedText + textAfter;
        textarea.value = newContent;
        
        // Select the new text
        textarea.setSelectionRange(start, start + expandedText.length);
        
        updateSectionContent(sectionNum);
        
    } catch (error) {
        await customAlert(`Failed to expand selection: ${error.message}`, 'Expand Error');
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}


/**
 * Update overall writing progress
 */
function updateOverallProgress() {
    const completedSections = bookData.sections.filter(ch => ch && ch.toString().trim().length > 0).length;
    const progress = (completedSections / bookData.numSections) * 100;

    const progressEl = document.getElementById('writing-progress');
    if (progressEl) {
        progressEl.style.width = progress + '%';
    }

    // Show/hide Next button based on completion
    const nextBtn = document.getElementById('writing-next');
    if (nextBtn) {
        nextBtn.style.display = (completedSections === bookData.numSections) ? 'inline-flex' : 'none';
    }

}

/**
 * Regenerate section with confirmation
 * @param {number} sectionNum - Section number
 */
async function regenerateSection(sectionNum) {
    const confirmed = await customConfirm(`Are you sure you want to regenerate Section ${sectionNum}? This will overwrite the current content.`, 'Regenerate Section');
    if (!confirmed) return;

    // Clear previous content and regenerate
    const contentEl = document.getElementById(`section-${sectionNum}-content`);
    if (contentEl) {
        contentEl.value = '';
        updateSectionContent(sectionNum);
    }

    await generateSingleSection(sectionNum);
}

/**
 * Select all sections for batch generation
 */
function selectAllSections() {
    for (let i = 1; i <= bookData.numSections; i++) {
        const checkbox = document.getElementById(`section-${i}-checkbox`);
        if (checkbox) checkbox.checked = true;
    }
    updateGenerateSelectedButton();
}

/**
 * Deselect all sections
 */
function deselectAllSections() {
    for (let i = 1; i <= bookData.numSections; i++) {
        const checkbox = document.getElementById(`section-${i}-checkbox`);
        if (checkbox) checkbox.checked = false;
    }
    updateGenerateSelectedButton();
}

/**
 * Update generate selected button state
 */
function updateGenerateSelectedButton() {
    const selected = getSelectedSections().length;
    const btn = document.getElementById('generate-selected-btn');
    if (!btn) return;

    if (selected > 0) {
        btn.innerHTML = `<span class="label">Generate Selected (${selected})</span>`;
        btn.disabled = false;
        btn.classList.remove('btn-ghost');
        btn.classList.add('btn-primary');
    } else {
        btn.innerHTML = '<span class="label">Generate Selected (0)</span>';
        btn.disabled = true;
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-ghost');
    }
}

/**
 * Get selected sections for batch processing
 * @returns {number[]} Array of selected section numbers
 */
function getSelectedSections() {
    const selected = [];
    for (let i = 1; i <= bookData.numSections; i++) {
        const cb = document.getElementById(`section-${i}-checkbox`);
        if (cb && cb.checked) selected.push(i);
    }
    return selected;
}

/**
 * Generate selected sections in batch
 */
async function generateSelectedSections() {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }

    const selectedSections = getSelectedSections();
    if (selectedSections.length === 0) {
        await customAlert('Please select at least one section to generate.', 'No Sections Selected');
        return;
    }

    isGenerating = true;
    const total = selectedSections.length;
    let completed = 0;

    try {
        showGenerationInfo(`Starting batch generation of ${total} sections...`);
        for (let idx = 0; idx < selectedSections.length; idx++) {
            const ch = selectedSections[idx];
            completed = idx + 1;

            showGenerationInfo(`Writing Section ${ch} (${completed} of ${total})...`);
            document.getElementById(`section-${ch}-status`).innerHTML = '<div class="loading"><div class="spinner"></div>Writing...</div>';
            document.getElementById(`section-${ch}-generate-btn`).disabled = true;

            try {
                const content = await writeSection(ch);
                document.getElementById(`section-${ch}-content`).value = content;
                updateSectionContent(ch);
                document.getElementById(`section-${ch}-status`).innerHTML = `✓ Generated (${completed}/${total})`;
                document.getElementById(`section-${ch}-checkbox`).checked = false;
            } catch (err) {
                document.getElementById(`section-${ch}-status`).innerHTML = `❌ Error: ${err.message}`;
                break;
            } finally {
                document.getElementById(`section-${ch}-generate-btn`).disabled = false;
            }
        }

        updateGenerateSelectedButton();

        if (completed === total) {
            showGenerationInfo(`Batch generation complete! ${completed} sections generated.`);
            setTimeout(() => { hideGenerationInfo(); }, 2000);
        }
    } finally {
        isGenerating = false;
        if (completed < total) {
            hideGenerationInfo();
        }
    }
}

/**
 * Generate all sections
 */
async function generateAllSections() {
    selectAllSections();
    await generateSelectedSections();
}

/**
 * Run feedback for individual section
 * @param {number} sectionNum - Section number
 */
async function runSectionFeedback(sectionNum) {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }

    const section = document.getElementById(`section-${sectionNum}-content`).value;
    if (!section.trim()) {
        await customAlert('No section content to improve. Please write or generate the section first.', 'No Content');
        return;
    }

    isGenerating = true;
    showGenerationInfo(`Analyzing Section ${sectionNum}...`);

    try {
        // Check if feedback elements exist (they may have been removed)
        const feedbackLoopsEl = document.getElementById('writing-feedback-loops');
        const feedbackModeEl = document.getElementById('writing-feedback-mode');
        
        // Use default values if elements don't exist
        const feedbackLoops = feedbackLoopsEl ? parseInt(feedbackLoopsEl.value) || 1 : 1;
        const feedbackMode = feedbackModeEl ? feedbackModeEl.value : 'ai';

        let manualFeedback = '';
        if (feedbackMode === 'manual') {
            const manualInputEl = document.getElementById('writing-manual-input');
            if (manualInputEl) {
                manualFeedback = manualInputEl.value;
                if (!manualFeedback.trim()) {
                    await customAlert('Please provide manual feedback instructions before running the feedback loop.', 'Missing Feedback');
                    return;
                }
            }
        }

        document.getElementById(`section-${sectionNum}-status`).innerHTML = '<div class="loading"><div class="spinner"></div>Running feedback analysis...</div>';

        let improvedSection = section;
        const feedbackModel = getSelectedModel('feedback');

        for (let i = 0; i < feedbackLoops; i++) {
            if (feedbackMode === 'manual') {
                improvedSection = await runManualFeedback('section', improvedSection, manualFeedback, feedbackModel);
            } else {
                improvedSection = await runAIFeedback('section', improvedSection, feedbackModel);
            }
        }

        document.getElementById(`section-${sectionNum}-content`).value = improvedSection;
        updateSectionContent(sectionNum);

        document.getElementById(`section-${sectionNum}-status`).innerHTML = `Improved with ${feedbackLoops} ${feedbackMode} feedback loop(s)`;
    } catch (error) {
        document.getElementById(`section-${sectionNum}-status`).innerHTML = `Feedback error: ${error.message}`;
        await customAlert(`Error in feedback loop: ${error.message}`, 'Feedback Error');
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}

// Global variable to store current section being edited
let currentEditingSection = null;

// Global variable to store section content for undo functionality
let currentSectionEditMode = 'automated';

/**
 * Show section edit modal
 * @param {number} sectionNum - Section number
 */
function showSectionEditModal(sectionNum) {
    // Ensure writing interface is initialized so section elements exist
    ensureWritingInterfaceInitialized();
    
    currentEditingSection = sectionNum;
    
    // Update modal title
    document.getElementById('section-edit-title').textContent = `Edit Section ${sectionNum}`;
    
    // Reset form
    selectEditMode('automated');
    document.getElementById('section-edit-instructions').value = '';
    document.getElementById('section-edit-loops').value = '1';
    
    // Show modal
    document.getElementById('section-edit-modal').style.display = 'flex';
}

/**
 * Toggle edit mode using toggle switch
 * @param {HTMLInputElement} toggleElement - The checkbox input element
 */
function toggleEditMode(toggleElement) {
    const mode = toggleElement.checked ? 'automated' : 'manual';
    currentSectionEditMode = mode;
    
    // Update status text
    const statusElement = document.getElementById('edit-mode-status');
    if (statusElement) {
        statusElement.textContent = mode === 'automated' ? 'Automated' : 'Manual';
    }
    
    // Show/hide manual feedback section
    const manualSection = document.getElementById('manual-edit-feedback');
    if (mode === 'manual') {
        manualSection.style.display = 'block';
    } else {
        manualSection.style.display = 'none';
    }
}

/**
 * Select edit mode and update UI (legacy function for compatibility)
 * @param {string} mode - 'automated' or 'manual'
 */
function selectEditMode(mode) {
    const toggle = document.getElementById('edit-mode-toggle');
    if (toggle) {
        toggle.checked = mode === 'automated';
        toggleEditMode(toggle);
    }
}

/**
 * Close section edit modal
 */
function closeSectionEditModal() {
    document.getElementById('section-edit-modal').style.display = 'none';
    currentEditingSection = null;
}

/**
 * Execute section edit based on selected mode
 */
async function executeSectionEdit() {
    if (!currentEditingSection) {
        return;
    }
    
    const editMode = currentSectionEditMode;
    const feedbackLoops = parseInt(document.getElementById('section-edit-loops').value);
    let manualFeedback = '';
    
    if (editMode === 'manual') {
        manualFeedback = document.getElementById('section-edit-instructions').value.trim();
        if (!manualFeedback) {
            await customAlert('Please provide edit instructions for manual mode.', 'Missing Instructions');
            return;
        }
    }
    
    // Store the section number before closing modal
    const sectionToEdit = currentEditingSection;
    
    // Close modal
    closeSectionEditModal();
    
    // Execute the edit  
    await runSectionEdit(sectionToEdit, editMode, feedbackLoops, manualFeedback);
}

/**
 * Run section edit with specified parameters
 * @param {number} sectionNum - Section number
 * @param {string} editMode - 'automated' or 'manual'
 * @param {number} feedbackLoops - Number of edit loops
 * @param {string} manualFeedback - Manual feedback for manual mode
 */
async function runSectionEdit(sectionNum, editMode, feedbackLoops, manualFeedback = '') {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }

    const sectionElement = document.getElementById(`section-${sectionNum}-content`);
    if (!sectionElement) {
        await customAlert(`Could not find section ${sectionNum} content element. Please try refreshing the page.`, 'Element Not Found');
        return;
    }
    
    const section = sectionElement.value;
    
    if (!section.trim()) {
        await customAlert('No section content to edit. Please write or generate the section first.', 'No Content');
        return;
    }

    // Save state for undo before editing
    saveStateForUndo(`Edit Section ${sectionNum}`);

    try {
        isGenerating = true;
        document.getElementById(`section-${sectionNum}-status`).innerHTML = `Editing Section ${sectionNum}...`;
        showGenerationInfo(`Editing Section ${sectionNum} with ${editMode} mode...`);

        let improvedSection = section;
        const feedbackModel = getSelectedModel('feedback');

        for (let i = 0; i < feedbackLoops; i++) {
            showGenerationInfo(`Running ${editMode} edit loop ${i + 1} of ${feedbackLoops}...`);
            
            if (editMode === 'manual') {
                improvedSection = await runManualFeedback('section', improvedSection, manualFeedback, feedbackModel);
            } else {
                improvedSection = await runSpecializedEdit('section', improvedSection, feedbackModel, sectionNum);
            }
        }

        const updateElement = document.getElementById(`section-${sectionNum}-content`);
        if (updateElement) {
            updateElement.value = improvedSection;
            updateSectionContent(sectionNum);
        }

        document.getElementById(`section-${sectionNum}-status`).innerHTML = `Edited with ${feedbackLoops} ${editMode} edit loop(s)`;
        
        // Undo/redo now handled by global toolbar
        
    } catch (error) {
        document.getElementById(`section-${sectionNum}-status`).innerHTML = `Edit error: ${error.message}`;
        await customAlert(`Error during editing: ${error.message}`, 'Edit Error');
        // No need to clean up undo data - handled by global system
    } finally {
        isGenerating = false;
        hideGenerationInfo();
    }
}

/**
 * Undo section edit - restore original content
 * @param {number} sectionNum - Section number
 */
// Outline Edit Modal Functions
let currentOutlineEditMode = 'automated';

function showBlueprintEditModal() {
    // Reset form
    selectOutlineEditMode('automated');
    document.getElementById('outline-edit-instructions').value = '';
    document.getElementById('outline-edit-loops').value = '1';
    
    // Show modal
    document.getElementById('outline-edit-modal').style.display = 'flex';
}

function closeBlueprintEditModal() {
    document.getElementById('outline-edit-modal').style.display = 'none';
}

/**
 * Toggle outline edit mode using toggle switch
 * @param {HTMLInputElement} toggleElement - The checkbox input element
 */
function toggleBlueprintEditMode(toggleElement) {
    const mode = toggleElement.checked ? 'automated' : 'manual';
    currentOutlineEditMode = mode;
    
    // Update status text
    const statusElement = document.getElementById('outline-edit-mode-status');
    if (statusElement) {
        statusElement.textContent = mode === 'automated' ? 'Automated' : 'Manual';
    }
    
    // Show/hide manual feedback section
    const manualSection = document.getElementById('manual-outline-edit-feedback');
    if (mode === 'manual') {
        manualSection.style.display = 'block';
    } else {
        manualSection.style.display = 'none';
    }
}

function selectOutlineEditMode(mode) {
    const toggle = document.getElementById('outline-edit-mode-toggle');
    if (toggle) {
        toggle.checked = mode === 'automated';
        toggleBlueprintEditMode(toggle);
    }
}

async function executeBlueprintEdit() {
    const feedbackLoops = parseInt(document.getElementById('outline-edit-loops').value);
    let manualFeedback = '';
    
    if (currentOutlineEditMode === 'manual') {
        manualFeedback = document.getElementById('outline-edit-instructions').value.trim();
        if (!manualFeedback) {
            await customAlert('Please provide edit instructions for manual mode.', 'Instructions Required');
            return;
        }
    }
    
    closeOutlineEditModal();
    
    // Run the edit function (similar to runSectionEdit but for blueprint)
    await runBlueprintEdit(currentOutlineEditMode, feedbackLoops, manualFeedback);
}

// Section Outline Edit Modal Functions
let currentSectionOutlineEditMode = 'automated';

function showOutlineEditModal() {
    // Reset form
    selectOutlineEditMode('automated');
    const instructionsEl = document.getElementById('outline-edit-instructions');
    const loopsEl = document.getElementById('outline-edit-loops');
    const modal = document.getElementById('outline-edit-modal');
    
    if (instructionsEl) instructionsEl.value = '';
    if (loopsEl) loopsEl.value = '1';
    
    // Show modal
    if (modal) {
        modal.style.display = 'flex';
    }
}

function showSectionOutlineEditModal() {
    // Reset form
    selectSectionOutlineEditMode('automated');
    const instructionsEl = document.getElementById('section-outline-edit-instructions');
    const loopsEl = document.getElementById('section-outline-edit-loops');
    const modal = document.getElementById('section-outline-edit-modal');
    
    if (instructionsEl) instructionsEl.value = '';
    if (loopsEl) loopsEl.value = '1';
    
    // Show modal
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeOutlineEditModal() {
    const modal = document.getElementById('outline-edit-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function closeSectionOutlineEditModal() {
    const modal = document.getElementById('section-outline-edit-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Toggle section outline edit mode using toggle switch
 * @param {HTMLInputElement} toggleElement - The checkbox input element
 */
function toggleSectionOutlineEditMode(toggleElement) {
    const mode = toggleElement.checked ? 'automated' : 'manual';
    currentSectionOutlineEditMode = mode;
    
    // Update status text
    const statusElement = document.getElementById('section-outline-edit-mode-status');
    if (statusElement) {
        statusElement.textContent = mode === 'automated' ? 'Automated' : 'Manual';
    }
    
    // Show/hide manual feedback section
    const manualSection = document.getElementById('manual-section-outline-edit-feedback');
    if (manualSection) {
        if (mode === 'manual') {
            manualSection.style.display = 'block';
        } else {
            manualSection.style.display = 'none';
        }
    }
}

function selectSectionOutlineEditMode(mode) {
    const toggle = document.getElementById('section-outline-edit-mode-toggle');
    if (toggle) {
        toggle.checked = mode === 'automated';
        toggleSectionOutlineEditMode(toggle);
    }
}

async function executeOutlineEdit() {
    const feedbackLoops = parseInt(document.getElementById('outline-edit-loops').value);
    let manualFeedback = '';
    
    if (currentOutlineEditMode === 'manual') {
        manualFeedback = document.getElementById('outline-edit-instructions').value.trim();
        if (!manualFeedback) {
            await customAlert('Please provide edit instructions for manual mode.', 'Instructions Required');
            return;
        }
    }
    
    closeOutlineEditModal();
    
    // Run the edit function (similar to runSectionEdit but for section outline)
    await runOutlineEdit(currentOutlineEditMode, feedbackLoops, manualFeedback);
}

async function executeSectionOutlineEdit() {
    const feedbackLoops = parseInt(document.getElementById('section-outline-edit-loops').value);
    let manualFeedback = '';
    
    if (currentSectionOutlineEditMode === 'manual') {
        manualFeedback = document.getElementById('section-outline-edit-instructions').value.trim();
        if (!manualFeedback) {
            await customAlert('Please provide edit instructions for manual mode.', 'Instructions Required');
            return;
        }
    }
    
    closeSectionOutlineEditModal();
    
    // Run the edit function for section outline
    await runOutlineEdit(currentSectionOutlineEditMode, feedbackLoops, manualFeedback);
}

// Outline Edit Function
async function runBlueprintEdit(editMode, feedbackLoops, manualFeedback = '') {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }

    const outlineElement = document.getElementById('blueprint-content');
    if (!outlineElement) {
        await customAlert('Could not find book blueprint content element.', 'Element Not Found');
        return;
    }
    
    const outline = outlineElement.value;
    
    if (!outline.trim()) {
        await customAlert('No book blueprint content to edit. Please generate the book blueprint first.', 'No Content');
        return;
    }

    // Save state for undo before editing
    saveStateForUndo('Edit Book Blueprint');

    try {
        isGenerating = true;
        showGenerationInfo(`Editing Book Blueprint with ${editMode} mode...`);

        let improvedOutline = outline;

        for (let i = 0; i < feedbackLoops; i++) {
            if (editMode === 'manual') {
                improvedOutline = await runManualFeedback('blueprint', improvedOutline, manualFeedback, getSelectedModel());
            } else {
                improvedOutline = await runSpecializedEdit('blueprint', improvedOutline, getSelectedModel());
            }
        }

        // Update outline content
        outlineElement.value = improvedOutline;
        bookData.blueprint = improvedOutline;
        saveToLocalStorage();

        // Hide progress before showing success alert
        hideGenerationInfo();
        
        // Only show completion alert if not in one-click generation mode
        if (!window.oneClickInProgress) {
            await customAlert(`Book Blueprint edited successfully with ${feedbackLoops} ${editMode} edit loop(s).`, 'Edit Complete');
        }
        
    } catch (error) {
        hideGenerationInfo();
        await customAlert(`Error during editing: ${error.message}`, 'Edit Error');
    } finally {
        isGenerating = false;
        // hideGenerationInfo() moved to before success alert
    }
}

// Section Outline Edit Function
async function runOutlineEdit(editMode, feedbackLoops, manualFeedback = '') {
    if (isGenerating) {
        showGenerationInfo();
        return;
    }

    const sectionOutlineElement = document.getElementById('outline-content');
    if (!sectionOutlineElement) {
        await customAlert('Could not find section outline content element.', 'Element Not Found');
        return;
    }
    
    const sectionOutline = sectionOutlineElement.value;
    
    if (!sectionOutline.trim()) {
        await customAlert('No section outline content to edit. Please generate the section outline first.', 'No Content');
        return;
    }

    // Save state for undo before editing
    saveStateForUndo('Edit Section Outline');

    try {
        isGenerating = true;
        showGenerationInfo(`Editing Section Outline with ${editMode} mode...`);

        let improvedSectionOutline = sectionOutline;

        for (let i = 0; i < feedbackLoops; i++) {
            if (editMode === 'manual') {
                improvedSectionOutline = await runManualFeedback('sections', improvedSectionOutline, manualFeedback, getSelectedModel());
            } else {
                improvedSectionOutline = await runSpecializedEdit('sections', improvedSectionOutline, getSelectedModel());
            }
        }

        // Update section outline content
        sectionOutlineElement.value = improvedSectionOutline;
        bookData.sectionOutline = improvedSectionOutline;
        saveToLocalStorage();

        // Hide progress before showing success alert
        hideGenerationInfo();
        
        // Only show completion alert if not in one-click generation mode
        if (!window.oneClickInProgress) {
            await customAlert(`Section outline edited successfully with ${feedbackLoops} ${editMode} edit loop(s).`, 'Edit Complete');
        }
        
    } catch (error) {
        hideGenerationInfo();
        await customAlert(`Error during editing: ${error.message}`, 'Edit Error');
    } finally {
        isGenerating = false;
        // hideGenerationInfo() moved to before success alert
    }
}

/**
 * Run manual feedback improvement
 * @param {string} contentType - Type of content
 * @param {string} content - Content to improve
 * @param {string} manualFeedback - Manual feedback instructions
 * @param {string} feedbackModel - Model to use
 * @returns {Promise<string>} Improved content
 */
async function runManualFeedback(contentType, content, manualFeedback, feedbackModel) {
    const improvementPrompt = formatPrompt(aiSettings.customPrompts.manualImprovement || defaultPrompts.manualImprovement, {
        contentType: contentType,
        originalContent: content,
        manualFeedback: manualFeedback,
        category: bookData.category,
        targetAudience: bookData.targetAudience,
        topic: bookData.topic,
        styleDirection: bookData.styleDirection,
        targetWordCount: bookData.targetWordCount,
        numSections: bookData.numSections
    });
    
    return await callAI(improvementPrompt, "You are a master non-fiction author and professional editor implementing specific feedback requests.", feedbackModel);
}
 
/**
 * Run AI feedback improvement
 * @param {string} contentType - Type of content to improve
 * @param {string} content - Content to improve
 * @param {string} feedbackModel - Model to use
 * @returns {Promise<string>} Improved content
 */
async function runAIFeedback(contentType, content, feedbackModel) {
    const analysisPrompt = formatPrompt(getCustomAnalysisPrompt(contentType), {
        contentType: contentType,
        content: content,
        category: bookData.category,
        targetAudience: bookData.targetAudience,
        topic: bookData.topic,
        styleDirection: bookData.styleDirection,
        targetWordCount: bookData.targetWordCount,
        numSections: bookData.numSections
    });
    
    const analysis = await callAI(analysisPrompt, "You are a professional editor and story consultant.", feedbackModel);
    
    const improvementPrompt = formatPrompt(aiSettings.customPrompts.improvement || defaultPrompts.improvement, {
        contentType: contentType,
        originalContent: content,
        feedbackContent: analysis,
        targetAudience: bookData.targetAudience,
        category: bookData.category,
        topic: bookData.topic,
        styleDirection: bookData.styleDirection,
        targetWordCount: bookData.targetWordCount,
        numSections: bookData.numSections
    });
    
    return await callAI(improvementPrompt, "You are a master non-fiction author and professional editor.", feedbackModel);
}

/**
 * Run specialized edit for different content types using format-specific prompts
 * @param {string} contentType - Type of content (outline, sections, section)
 * @param {string} content - Content to edit
 * @param {string} feedbackModel - Model to use
 * @param {number} sectionNum - Section number (for section edits)
 * @returns {Promise<string>} Improved content
 */
async function runSpecializedEdit(contentType, content, feedbackModel, sectionNum = null) {
    let promptKey;
    let additionalData = {};
    
    switch (contentType) {
        case 'blueprint':
            promptKey = 'blueprintEdit';
            break;
        case 'sections':
            promptKey = 'sectionsEdit';
            additionalData = { blueprint: bookData.blueprint };
            break;
        case 'section':
            promptKey = 'sectionEdit';
            additionalData = { 
                sectionNum: sectionNum,
                sectionOutline: getSectionOutlineForSection(sectionNum)
            };
            break;
        default:
            throw new Error(`Unknown content type: ${contentType}`);
    }
    
    const editPrompt = formatPrompt(defaultPrompts[promptKey], {
        contentType: contentType,
        originalContent: content,
        category: bookData.category,
        targetAudience: bookData.targetAudience,
        topic: bookData.topic,
        styleDirection: bookData.styleDirection,
        targetWordCount: bookData.targetWordCount,
        numSections: bookData.numSections,
        ...additionalData
    });
    
    return await callAI(editPrompt, "You are a master non-fiction author and professional editor.", feedbackModel);
}

/**
 * Get section outline section for specific section
 * @param {number} sectionNum - Section number
 * @returns {string} Section outline section
 */
function getSectionOutlineForSection(sectionNum) {
    if (!bookData.sectionOutline) return '';
    
    // Try to extract the specific section section from the full outline
    const lines = bookData.sectionOutline.split('\n');
    let sectionStart = -1;
    let sectionEnd = -1;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.match(new RegExp(`\\*\\*CHAPTER\\s+${sectionNum}\\s*:`, 'i'))) {
            sectionStart = i;
        } else if (sectionStart !== -1 && line.match(/\*\*CHAPTER\s+\d+\s*:/i) && !line.match(new RegExp(`\\*\\*CHAPTER\\s+${sectionNum}\\s*:`, 'i'))) {
            sectionEnd = i;
            break;
        }
    }
    
    if (sectionStart !== -1) {
        const endIndex = sectionEnd !== -1 ? sectionEnd : lines.length;
        return lines.slice(sectionStart, endIndex).join('\n').trim();
    }
    
    return bookData.sectionOutline; // Fallback to full outline
}
 
/**
 * Get custom analysis prompt
 * @param {string} contentType - Type of content
 * @returns {string} Analysis prompt
 */
function getCustomAnalysisPrompt(contentType) {
    const customPrompt = document.getElementById(`${contentType}-feedback-prompt`)?.value;
    return customPrompt && customPrompt.trim() ? customPrompt : (aiSettings.customPrompts.analysis || defaultPrompts.analysis);
}

// ==================================================
// EXPAND MODAL
// ==================================================

/**
 * Expand section in full-screen modal
 * @param {number} sectionNum - Section number
 */
function expandSection(sectionNum) {
    const textarea = document.getElementById(`section-${sectionNum}-content`);
    const content = textarea.value;
    
    currentExpandedSection = sectionNum;
    
    document.getElementById('expand-section-title').textContent = `Section ${sectionNum} - Expanded View`;
    document.getElementById('expand-textarea').value = content;
    
    updateExpandedWordCount();
    
    const modal = document.getElementById('expand-modal');
    modal.classList.add('active');
    
    setTimeout(() => {
        document.getElementById('expand-textarea').focus();
    }, 100);
}

/**
 * Update word count in expand modal
 */
function updateExpandedWordCount() {
    const content = document.getElementById('expand-textarea').value;
    const wordCount = countWords(content);
    const readingTime = Math.ceil(wordCount / CONFIG.READING_SPEED_WPM);
    
    document.getElementById('expand-word-count').textContent = `${wordCount} words`;
    document.getElementById('expand-reading-time').textContent = `${readingTime} min read`;
}

/**
 * Save expanded section content
 */
function saveExpandedSection() {
    if (currentExpandedSection) {
        const content = document.getElementById('expand-textarea').value;
        document.getElementById(`section-${currentExpandedSection}-content`).value = content;
        updateSectionContent(currentExpandedSection);
        
        const saveBtn = event?.target || document.querySelector('#expand-modal .expand-controls .btn-success');
        const originalText = saveBtn?.innerHTML || 'Save';
        if (saveBtn) {
            saveBtn.innerHTML = '<span class="label">Saved!</span>';
            setTimeout(() => {
                saveBtn.innerHTML = originalText;
            }, 2000);
        }
    }
}

/**
 * Toggle expanded read mode
 */
function toggleExpandedReadMode() {
    const editor = document.getElementById('expand-editor');
    const reader = document.getElementById('expand-reader');
    const label = document.getElementById('read-mode-label');
    
    if (editor.style.display === 'none') {
        editor.style.display = 'block';
        reader.style.display = 'none';
        label.textContent = 'Read Mode';
    } else {
        const content = document.getElementById('expand-textarea').value;
        document.getElementById('expand-reader-content').innerHTML = content.replace(/\n/g, '<br>');
        editor.style.display = 'none';
        reader.style.display = 'block';
        label.textContent = 'Edit Mode';
    }
}

/**
 * Close expand modal
 */
function closeExpandModal() {
    const modal = document.getElementById('expand-modal');
    modal.classList.remove('active');
    currentExpandedSection = null;
}

// ==================================================
// ONE-CLICK GENERATION
// ==================================================

/**
 * Start one-click generation configuration
 */
async function startOneClickGeneration() {
    collectBookData();
    
    if (!bookData.category || !bookData.targetAudience || !bookData.topic) {
        await customAlert('Please fill in all required fields before starting one-click generation.', 'Missing Information');
        return;
    }
    
    document.getElementById('one-click-modal').style.display = 'flex';
}
 
/**
 * Close one-click modal
 */
function closeOneClickModal() {
    document.getElementById('one-click-modal').style.display = 'none';
}
 
/**
 * Start one-click generation process
 */
async function startOneClickProcess() {
    const outlineLoops = parseInt(document.getElementById('one-click-outline-loops').value);
    const sectionsLoops = parseInt(document.getElementById('one-click-sections-loops').value);
    const writingLoops = parseInt(document.getElementById('one-click-writing-loops').value);
    
    closeOneClickModal();
    
    oneClickCancelled = false;
    window.oneClickInProgress = true;
    showGenerationInfo('Starting one-click generation...');
    
    try {
        // Step 1: Generate Outline with retry logic
        showGenerationInfo('Generating book blueprint...');
        showStep('blueprint');
        
        let outlineRetries = 0;
        const maxOutlineRetries = 3;
        let outlineSuccess = false;
        
        while (!outlineSuccess && outlineRetries < maxOutlineRetries) {
            try {
                if (outlineRetries > 0) {
                    showGenerationInfo(`Retrying book blueprint generation (attempt ${outlineRetries + 1}/${maxOutlineRetries})...`);
                    const delay = Math.pow(2, outlineRetries) * 2000; // 2s, 4s, 8s
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
                await generateBlueprint();
                outlineSuccess = true;
                
            } catch (error) {
                outlineRetries++;
                console.error(`Story bible generation attempt ${outlineRetries} failed:`, error.message);
                
                if (outlineRetries >= maxOutlineRetries) {
                    throw new Error(`Failed to generate book blueprint after ${maxOutlineRetries} attempts: ${error.message}`);
                }
            }
        }
        
        if (oneClickCancelled) return;
        
        if (outlineLoops > 0) {
            showGenerationInfo(`Improving book blueprint (${outlineLoops} feedback loops)...`);
            await runBlueprintEdit('automated', outlineLoops, '');
        }
        
        if (oneClickCancelled) return;
        
        // Step 2: Generate Section Outline with retry logic
        showGenerationInfo('Creating detailed section outline...');
        showStep('sections');
        
        let sectionOutlineRetries = 0;
        const maxSectionOutlineRetries = 3;
        let sectionOutlineSuccess = false;
        
        while (!sectionOutlineSuccess && sectionOutlineRetries < maxSectionOutlineRetries) {
            try {
                if (sectionOutlineRetries > 0) {
                    showGenerationInfo(`Retrying section outline generation (attempt ${sectionOutlineRetries + 1}/${maxSectionOutlineRetries})...`);
                    const delay = Math.pow(2, sectionOutlineRetries) * 2000; // 2s, 4s, 8s
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
                await generateSectionOutline();
                sectionOutlineSuccess = true;
                
            } catch (error) {
                sectionOutlineRetries++;
                console.error(`Section outline generation attempt ${sectionOutlineRetries} failed:`, error.message);
                
                if (sectionOutlineRetries >= maxSectionOutlineRetries) {
                    throw new Error(`Failed to generate section outline after ${maxSectionOutlineRetries} attempts: ${error.message}`);
                }
            }
        }
        
        if (oneClickCancelled) return;
        
        if (sectionsLoops > 0) {
            showGenerationInfo(`Improving section outline (${sectionsLoops} feedback loops)...`);
            await runOutlineEdit('automated', sectionsLoops, '');
        }
        
        if (oneClickCancelled) return;
        
        // Step 3: Setup Writing Interface and Generate Sections
        showGenerationInfo('Setting up writing interface...');
        showStep('writing');
        
        showGenerationInfo('Writing all sections...');
        
        for (let i = 1; i <= bookData.numSections; i++) {
            if (oneClickCancelled) return;
            
            showGenerationInfo(`Writing Section ${i} of ${bookData.numSections}...`);
            
            // Retry section generation with exponential backoff
            let sectionRetries = 0;
            const maxSectionRetries = 3;
            let sectionSuccess = false;
            
            while (!sectionSuccess && sectionRetries < maxSectionRetries) {
                try {
                    if (sectionRetries > 0) {
                        showGenerationInfo(`Retrying Section ${i} (attempt ${sectionRetries + 1}/${maxSectionRetries})...`);
                        const delay = Math.pow(2, sectionRetries) * 2000; // 2s, 4s, 8s
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                    
                    await generateSingleSection(i);
                    sectionSuccess = true;
                    
                } catch (error) {
                    sectionRetries++;
                    console.error(`Section ${i} generation attempt ${sectionRetries} failed:`, error.message);
                    
                    if (sectionRetries >= maxSectionRetries) {
                        throw new Error(`Failed to generate Section ${i} after ${maxSectionRetries} attempts: ${error.message}`);
                    }
                }
            }
            
            if (writingLoops > 0) {
                showGenerationInfo(`Improving Section ${i} with feedback...`);
                await runSectionEdit(i, 'ai', writingLoops, '');
            }
            
            updateOverallProgress();
        }
        
        if (oneClickCancelled) return;
        
        // Step 4: Complete
        showGenerationInfo('Finalizing book...');
        showStep('export');
        updateBookStats();
        
        hideGenerationInfo();
        
        const completedSections = bookData.sections.filter(c => c).length;
        const totalWords = bookData.sections.filter(c => c).reduce((total, section) => total + countWords(section), 0);
        
        await customAlert(`One-click generation completed! 

Your book "${bookData.title || 'Untitled'}" is ready for export!

Final Stats:
• ${completedSections} sections completed
• ${totalWords.toLocaleString()} total words
• Ready for publishing!`, 'Generation Complete');
        
    } catch (error) {
        hideGenerationInfo();
        await customAlert(`One-click generation failed: ${error.message}`, 'Generation Failed');
    } finally {
        isGenerating = false;
        window.oneClickInProgress = false;
    }
}
 
/**
 * Cancel one-click generation
 */
function cancelOneClickGeneration() {
    oneClickCancelled = true;
    window.oneClickInProgress = false;
    hideGenerationInfo();
}
 
/**
 * Show loading overlay
 * @param {string} text - Loading text
 */
function showLoadingOverlay(text) {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading-overlay').style.display = 'flex';
    document.getElementById('cancel-btn').style.display = 'inline-flex';
}
 
/**
 * Update loading text
 * @param {string} text - New loading text
 */
function updateLoadingText(text) {
    document.getElementById('loading-text').textContent = text;
}
 
/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
    document.getElementById('loading-overlay').style.display = 'none';
    document.getElementById('cancel-btn').style.display = 'none';
    isGenerating = false;
}
 
/**
 * Proceed to export step
 */
function proceedToExport() {
    showStep('export');
    updateBookStats();
}
 
// ==================================================
// EXPORT FUNCTIONS
// ==================================================

/**
 * Update book statistics for export
 */
function updateBookStats() {
    if (!bookData.sections) return;

    let totalWords = 0;
    let completedSections = 0;
    
    bookData.sections.forEach(section => {
        if (section && section.trim().length > 0) {
            totalWords += countWords(section);
            completedSections++;
        }
    });

    const avgWords = completedSections > 0 ? Math.round(totalWords / completedSections) : 0;
    const readingTime = Math.round(totalWords / CONFIG.READING_SPEED_WPM);

    const elements = {
        'total-words': totalWords.toLocaleString(),
        'total-sections': completedSections,
        'avg-words': avgWords.toLocaleString(),
        'reading-time': readingTime
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
}
 
/**
 * Download book in specified format
 * @param {string} format - Export format (txt, html, md)
 */
async function downloadBook(format) {
    if (!bookData.sections || bookData.sections.length === 0) {
        await customAlert('No sections to download. Please complete the writing process first.', 'No Content');
        return;
    }

    let content = '';
    const title = bookData.title || bookData.topic.substring(0, 50) + (bookData.topic.length > 50 ? '...' : '');
    
    switch(format) {
        case 'txt':
            content = generateTxtContent(title);
            downloadFile(content, `${sanitizeFilename(title)}.txt`, 'text/plain');
            break;
        case 'html':
            content = generateHtmlContent(title);
            downloadFile(content, `${sanitizeFilename(title)}.html`, 'text/html');
            break;
        case 'md':
            content = generateMarkdownContent(title);
            downloadFile(content, `${sanitizeFilename(title)}.md`, 'text/markdown');
            break;
        // EPUB export removed per feedback
    }
}

/**
 * Download file to user's computer
 * @param {string} content - File content
 * @param {string} filename - Name of the file
 * @param {string} mimeType - MIME type of the file
 */
function downloadFile(content, filename, mimeType) {
    try {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object
        setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
        console.error('Failed to download file:', error);
        customAlert(`Failed to download ${filename}: ${error.message}`, 'Download Error');
    }
}

/**
 * Sanitize filename for safe download
 * @param {string} filename - Original filename
 * @returns {string} Safe filename
 */
function sanitizeFilename(filename) {
    // Remove or replace unsafe characters for filenames
    return filename
        .replace(/[<>:"/\\|?*]/g, '-') // Replace unsafe characters with dash
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/[^\w\-_.]/g, '') // Remove any remaining non-word characters except dash, underscore, dot
        .substring(0, 100) // Limit length to 100 characters
        .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
        || 'untitled'; // Fallback if string becomes empty
}
 
/**
 * Generate text content for export
 * @param {string} title - Book title
 * @returns {string} Formatted text content
 */
function generateTxtContent(title) {
    let content = `${title}\n`;
    content += `Genre: ${bookData.category}\n`;
    content += `Target Audience: ${bookData.targetAudience}\n\n`;
    
    if (bookData.blurb) {
        content += `BOOK DESCRIPTION:\n${bookData.blurb}\n\n`;
    }
    
    content += '='.repeat(50) + '\n\n';

    bookData.sections.forEach((section, index) => {
        if (section) {
            content += `CHAPTER ${index + 1}\n\n`;
            content += section + '\n\n';
            content += '='.repeat(30) + '\n\n';
        }
    });

    return content;
}
 
/**
 * Generate HTML content for export
 * @param {string} title - Book title
 * @returns {string} Formatted HTML content
 */
function generateHtmlContent(title) {
    let content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="generator" content="BookForge - https://bookforge.net">
    <style>
        body { font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.8; }
        h1 { color: #333; border-bottom: 3px solid #007AFF; padding-bottom: 10px; }
        h2 { color: #666; margin-top: 40px; page-break-before: always; }
        .book-info { background: #f9f9f9; padding: 25px; border-radius: 10px; margin-bottom: 40px; }
        .book-blurb { background: #fff; padding: 20px; border-left: 4px solid #007AFF; margin: 20px 0; font-style: italic; }
        .section { margin-bottom: 50px; }
        p { margin-bottom: 1em; }
        .footer { text-align: center; margin-top: 50px; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <div class="book-info">
        <h1>${title}</h1>
        <p><strong>Genre:</strong> ${bookData.category}</p>
        <p><strong>Target Audience:</strong> ${bookData.targetAudience}</p>
        <p><strong>Style:</strong> ${bookData.styleDirection}</p>
        ${bookData.blurb ? `<div class="book-blurb">${bookData.blurb}</div>` : ''}
    </div>
`;

    bookData.sections.forEach((section, index) => {
        if (section) {
            content += `    <div class="section">
        <h2>Section ${index + 1}</h2>
        <p>${section.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>
    </div>
`;
        }
    });

    content += `    <div class="footer">
        <p>Generated by <a href="https://bookforge.net">BookForge</a></p>
    </div>
</body>
</html>`;
    return content;
}
 
/**
 * Generate Markdown content for export
 * @param {string} title - Book title
 * @returns {string} Formatted Markdown content
 */
function generateMarkdownContent(title) {
    let content = `# ${title}\n\n`;
    content += `**Genre:** ${bookData.category}  \n`;
    content += `**Target Audience:** ${bookData.targetAudience}  \n`;
    content += `**Style:** ${bookData.styleDirection}\n\n`;
    
    if (bookData.blurb) {
        content += `## Book Description\n\n`;
        content += `${bookData.blurb}\n\n`;
    }
    
    content += '---\n\n';

    bookData.sections.forEach((section, index) => {
        if (section) {
            content += `## Section ${index + 1}\n\n`;
            content += section + '\n\n';
            content += '---\n\n';
        }
    });

    content += `\n*Generated by [BookForge](https://bookforge.net)*\n`;
    return content;
}
 
/**
 * Copy book content to clipboard
 */
async function copyToClipboard() {
    if (!bookData.sections || bookData.sections.length === 0) {
        await customAlert('No content to copy. Please complete the writing process first.', 'No Content');
        return;
    }

    const title = bookData.title || bookData.topic;
    const content = generateTxtContent(title);
    try {
        await navigator.clipboard.writeText(content);
        await customAlert('Book content copied to clipboard!', 'Copied');
    } catch (err) {
        await customAlert('Failed to copy to clipboard. Please try downloading instead.', 'Copy Failed');
    }
}

/**
 * PROJECT MANAGEMENT
 * Continuation from previous sections
 * - Load, save, switch, delete projects
 * - Manage projects modal
 * - Import/Export projects
 */

// Load saved projects from localStorage
function loadProjects() {
    const savedProjects = localStorage.getItem('novelfactory_projects');
    projects = savedProjects ? JSON.parse(savedProjects) : {};
    const select = document.getElementById('project-select');
    
    if (!select) return;
    
    select.innerHTML = '';
    
    // Current project option
    const currentOption = document.createElement('option');
    currentOption.value = 'current';
    currentOption.textContent = 'Current Project';
    select.appendChild(currentOption);
    
    const projectIds = Object.keys(projects);
    if (projectIds.length > 0) {
        const separator = document.createElement('option');
        separator.value = '';
        separator.disabled = true;
        separator.textContent = '──────────';
        select.appendChild(separator);
        
        const sortedProjects = projectIds.sort((a, b) => {
            const dateA = new Date(projects[a].lastSaved || 0);
            const dateB = new Date(projects[b].lastSaved || 0);
            return dateB - dateA;
        });
        
        sortedProjects.forEach(projectId => {
            const project = projects[projectId];
            const option = document.createElement('option');
            option.value = projectId;
            let title = project.title || project.premise?.substring(0, 30) || `Project ${projectId.slice(-8)}`;
            if (title.length > 40) title = title.substring(0, 37) + '...';
            const date = new Date(project.lastSaved || project.createdAt);
            const dateStr = date.toLocaleDateString();
            option.textContent = `${title} (${dateStr})`;
            select.appendChild(option);
        });
    }
    
    updateDeleteButtonVisibility();
}

// Update visibility of Delete button based on selection
function updateDeleteButtonVisibility() {
    const select = document.getElementById('project-select');
    const deleteBtn = document.getElementById('delete-project-btn');
    if (deleteBtn && select) {
        const isCurrent = select.value === 'current' || !select.value;
        deleteBtn.style.display = isCurrent ? 'none' : 'inline-flex';
    }
}

// Create a new project (same functionality as Reset & Start New)
async function newProject() {
    const confirmed = await customConfirm('This will clear all current work and start fresh. Are you sure?', 'New Project');
    if (!confirmed) return;
    
    // Reset book data
    bookData = {
        id: 'current',
        title: '',
        blurb: '',
        category: '',
        targetAudience: '',
        premise: '',
        styleDirection: '',
        styleExcerpt: '',
        numSections: 20,
        targetWordCount: 2000,
        outline: '',
        sectionOutline: '',
        sections: [],
        currentStep: 'setup',
        createdAt: new Date().toISOString(),
        lastSaved: new Date().toISOString()
    };
    
    // Clear all form fields
    document.getElementById('category').value = '';
    document.getElementById('target-audience').value = '';
    document.getElementById('topic').value = '';
    document.getElementById('style-direction').value = '';
    document.getElementById('style-example').value = '';
    document.getElementById('num-sections').value = '20';
    document.getElementById('target-word-count').value = '2000';
    document.getElementById('blueprint-content').value = '';
    document.getElementById('outline-content').value = '';
    
    // Clear sections container
    const container = document.getElementById('sections-container');
    if (container) {
        container.innerHTML = '<div class="writing-placeholder"><p>Setting up writing interface...</p></div>';
    }
    
    // Reset navigation
    showStep('setup');
    updateNavProgress();
    updateWordCount();
    updateSectionEstimate();
    
    // Update project selector
    const selector = document.getElementById('project-select');
    if (selector) {
        selector.value = 'current';
        updateDeleteButtonVisibility();
    }
    
    // Save the reset state
    autoSave();
    
    await customAlert('Everything has been reset. You can now start a new project.', 'Reset Complete');
}

// Save current project
async function saveProject() {
    collectBookData();
    
    // Ensure latest content is captured
    const currentStep = document.querySelector('.step.active')?.id || bookData.currentStep;
    bookData.currentStep = currentStep;
    
    // If writing, serialize sections
    if (currentStep === 'writing' && bookData.sections) {
        for (let i = 0; i < bookData.numSections; i++) {
            const sectionEl = document.getElementById(`section-${i + 1}-content`);
            if (sectionEl && sectionEl.value) {
                bookData.sections[i] = sectionEl.value;
            }
        }
    }
    
    // Basic content check
    if (!bookData.topic && !bookData.blueprint && !bookData.sectionOutline) {
        await customAlert('Please add some content before saving the project.', 'No Content');
        return;
    }
    
    const savedProjects = localStorage.getItem('novelfactory_projects');
    const existingProjects = savedProjects ? JSON.parse(savedProjects) : {};
    const projectCount = Object.keys(existingProjects).length;
    
    if (projectCount >= CONFIG.MAX_SAVED_PROJECTS && bookData.id === 'current') {
        await customAlert(`You can save up to ${CONFIG.MAX_SAVED_PROJECTS} projects. Please delete some projects first or use the "Manage Projects" option.`, 'Project Limit Reached');
        return;
    }
    
    // Suggest a title
    let suggestedTitle = '';
    if (bookData.title) suggestedTitle = bookData.title;
    else if (bookData.topic) {
        suggestedTitle = bookData.topic.substring(0, 30).trim();
        if (bookData.topic.length > 30) suggestedTitle += '...';
    } else {
        suggestedTitle = `${bookData.category} book for ${bookData.targetAudience}`;
    }
    
    const title = await customInput('Enter a title for this project:', 'Save Project', suggestedTitle);
    if (!title) return;
    
    if (bookData.id === 'current') bookData.id = 'project_' + Date.now();
    bookData.title = title;
    bookData.lastSaved = new Date().toISOString();
    
    const projectToSave = { ...bookData };
    existingProjects[bookData.id] = projectToSave;
    localStorage.setItem('novelfactory_projects', JSON.stringify(existingProjects));
    localStorage.setItem('novelfactory_currentProject', JSON.stringify(projectToSave));
    
    loadProjects();
    const selector = document.getElementById('project-select');
    if (selector) {
        selector.value = bookData.id;
        updateDeleteButtonVisibility();
    }
    
    await customAlert('Project saved successfully!', 'Project Saved');
}

// Handle project action from dropdown
async function handleProjectAction(value) {
    if (!value || value === 'current') {
        updateDeleteButtonVisibility();
        return;
    }
    await switchProject(value);
}

// Switch to a different project
async function switchProject(projectId) {
    if (!projectId || projectId === 'current') {
        updateDeleteButtonVisibility();
        return;
    }
    
    const savedProjects = localStorage.getItem('novelfactory_projects');
    const allProjects = savedProjects ? JSON.parse(savedProjects) : {};
    
    if (allProjects[projectId]) {
        if (bookData.topic || bookData.blueprint) {
            const confirmed = await customConfirm('Loading a project will replace your current work. Continue?', 'Load Project');
            if (!confirmed) {
                const selector = document.getElementById('project-select');
                if (selector) selector.value = bookData.id || 'current';
                return;
            }
        }
        
        bookData = { ...allProjects[projectId] };
        populateFormFields();
        showStep(bookData.currentStep);
        updateDeleteButtonVisibility();
        await customAlert('Project loaded successfully!', 'Project Loaded');
    }
}

// Delete current project
async function deleteCurrentProject() {
    const selector = document.getElementById('project-select');
    const projectId = selector.value;
    if (projectId === 'current' || !projectId) return;
    
    const savedProjects = localStorage.getItem('novelfactory_projects');
    const allProjects = savedProjects ? JSON.parse(savedProjects) : {};
    const project = allProjects[projectId];
    if (!project) return;
    
    const projectTitle = project.title || project.premise?.substring(0, 30) || 'Untitled Project';
    const confirmed = await customConfirm(`Are you sure you want to delete "${projectTitle}"? This cannot be undone.`, 'Delete Project');
    if (!confirmed) return;
    
    delete allProjects[projectId];
    localStorage.setItem('novelfactory_projects', JSON.stringify(allProjects));
    
    selector.value = 'current';
    bookData.id = 'current';
    
    loadProjects();
    await customAlert('Project deleted successfully!', 'Project Deleted');
}

// Manage projects modal
function manageProjects() {
    updateProjectManagementModal();
    document.getElementById('project-management-modal').style.display = 'flex';
}

// Close project management modal
function closeProjectManagementModal() {
    document.getElementById('project-management-modal').style.display = 'none';
}

// Update project management modal content
function updateProjectManagementModal() {
    const savedProjects = localStorage.getItem('novelfactory_projects');
    const allProjects = savedProjects ? JSON.parse(savedProjects) : {};
    const projectIds = Object.keys(allProjects);
    
    document.getElementById('project-count').textContent = projectIds.length;
    const progressBar = document.getElementById('project-count-progress');
    progressBar.style.width = `${(projectIds.length / CONFIG.MAX_SAVED_PROJECTS) * 100}%`;
    
    const projectList = document.getElementById('project-list');
    projectList.innerHTML = '';
    
    if (projectIds.length === 0) {
        projectList.innerHTML = '<p class="no-projects">No saved projects found.</p>';
        return;
    }
    
    const sortedProjects = projectIds.sort((a, b) => {
        const dateA = new Date(allProjects[a].lastSaved || 0);
        const dateB = new Date(allProjects[b].lastSaved || 0);
        return dateB - dateA;
    });
    
    sortedProjects.forEach(projectId => {
        const project = allProjects[projectId];
        const projectDiv = document.createElement('div');
        projectDiv.className = 'project-item';
        
        const title = project.title || project.premise?.substring(0, 30) || 'Untitled Project';
        const wordCount = project.sections ? project.sections.filter(c => c).reduce((total, section) => total + countWords(section), 0) : 0;
        const date = new Date(project.lastSaved || project.createdAt).toLocaleDateString();
        
        projectDiv.innerHTML = `
            <div class="project-info">
                <h4>${title}</h4>
                <p>Category: ${project.category || 'Not set'} | Audience: ${project.targetAudience || 'Not set'}</p>
                <p>Words: ${wordCount.toLocaleString()} | Last saved: ${date}</p>
            </div>
            <div class="project-actions">
                <button class="btn btn-ghost btn-sm" onclick="loadProjectFromManagement('${projectId}')">
                    <span class="label">Load</span>
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteProjectFromManagement('${projectId}')">
                    <span class="label">Delete</span>
                </button>
            </div>
        `;
        projectList.appendChild(projectDiv);
    });
}

// Load project from management modal
async function loadProjectFromManagement(projectId) {
    closeProjectManagementModal();
    const selector = document.getElementById('project-select');
    if (selector) {
        selector.value = projectId;
        await switchProject(projectId);
    }
}

// Delete project from management modal
async function deleteProjectFromManagement(projectId) {
    const savedProjects = localStorage.getItem('novelfactory_projects');
    const allProjects = savedProjects ? JSON.parse(savedProjects) : {};
    const project = allProjects[projectId];
    if (!project) return;
    
    const projectTitle = project.title || project.premise?.substring(0, 30) || 'Untitled Project';
    const confirmed = await customConfirm(`Are you sure you want to delete "${projectTitle}"?`, 'Delete Project');
    if (!confirmed) return;
    
    delete allProjects[projectId];
    localStorage.setItem('novelfactory_projects', JSON.stringify(allProjects));
    
    const selector = document.getElementById('project-select');
    if (selector && selector.value === projectId) {
        selector.value = 'current';
        bookData.id = 'current';
    }
    
    loadProjects();
    updateProjectManagementModal();
    await customAlert('Project deleted successfully!', 'Project Deleted');
}

// Clear all saved projects
async function clearAllProjects() {
    const savedProjects = localStorage.getItem('novelfactory_projects');
    const allProjects = savedProjects ? JSON.parse(savedProjects) : {};
    const projectCount = Object.keys(allProjects).length;
    if (projectCount === 0) {
        await customAlert('No projects to delete.', 'No Projects');
        return;
    }
    const confirmed = await customConfirm(`Are you sure you want to delete all ${projectCount} saved projects? This cannot be undone.`, 'Delete All Projects');
    if (confirmed) {
        localStorage.removeItem('novelfactory_projects');
        loadProjects();
        updateProjectManagementModal();
        await customAlert('All projects deleted successfully!', 'Projects Cleared');
    }
}

// Export all projects
function exportAllProjects() {
    const savedProjects = localStorage.getItem('novelfactory_projects');
    const allProjects = savedProjects ? JSON.parse(savedProjects) : {};
    if (Object.keys(allProjects).length === 0) {
        customAlert('No projects to export.', 'No Projects');
        return;
    }
    const exportData = {
        exportDate: new Date().toISOString(),
        projectCount: Object.keys(allProjects).length,
        projects: allProjects,
        version: CONFIG.VERSION
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `novelfactory-projects-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Import projects
function importProjects() {
    document.getElementById('projects-import-file').click();
}

// Handle projects import
async function handleProjectsImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            if (!importData.projects || typeof importData.projects !== 'object') {
                throw new Error('Invalid project file format');
            }
            const importProjects = importData.projects;
            const importCount = Object.keys(importProjects).length;
            if (importCount === 0) {
                await customAlert('No projects found in the import file.', 'Import Error');
                return;
            }
            const savedProjects = localStorage.getItem('novelfactory_projects');
            const existingProjects = savedProjects ? JSON.parse(savedProjects) : {};
            const existingCount = Object.keys(existingProjects).length;
            if (existingCount + importCount > CONFIG.MAX_SAVED_PROJECTS) {
                const allowed = CONFIG.MAX_SAVED_PROJECTS - existingCount;
                const confirmed = await customConfirm(
                    `Importing ${importCount} projects would exceed the limit of ${CONFIG.MAX_SAVED_PROJECTS} projects. Only the first ${allowed} will be imported. Continue?`,
                    'Import Limit'
                );
                if (!confirmed) return;
            }
            let importedCount = 0;
            Object.entries(importProjects).forEach(([projectId, project]) => {
                if (Object.keys(existingProjects).length < CONFIG.MAX_SAVED_PROJECTS) {
                    const newId = 'imported_' + Date.now() + '_' + importedCount;
                    existingProjects[newId] = {
                        ...project,
                        id: newId,
                        lastSaved: new Date().toISOString()
                    };
                    importedCount++;
                }
            });
            localStorage.setItem('novelfactory_projects', JSON.stringify(existingProjects));
            loadProjects();
            updateProjectManagementModal();
            await customAlert(`Successfully imported ${importedCount} projects!`, 'Import Complete');
        } catch (error) {
            await customAlert('Error importing projects: Invalid file format', 'Import Error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ==================================================
// SETTINGS MANAGEMENT
// ==================================================

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('novelfactory_settings');
    if (savedSettings) {
        try {
            const loadedSettings = JSON.parse(savedSettings);
            Object.assign(aiSettings, loadedSettings);
            if (!aiSettings.advancedModels) aiSettings.advancedModels = {};
            if (!aiSettings.customPrompts) aiSettings.customPrompts = {};
        } catch (err) {
            console.error('Error parsing saved settings:', err);
        }
    }
    
    initializePrompts();
    loadFromLocalStorage();
    setTimeout(() => populateSettingsFields(), 100);
}

// Save settings to localStorage
function saveSettings() {
    try {
        const openrouterKey = document.getElementById('openrouter-api-key')?.value || '';
        const openaiKey = document.getElementById('openai-api-key')?.value || '';
        const modelSelect = document.getElementById('model-select')?.value || 'anthropic/claude-sonnet-4';
        const temperature = parseFloat(document.getElementById('temperature')?.value || 0.7);
        const maxTokens = parseInt(document.getElementById('max-tokens')?.value || 50000);
        const advancedEnabled = document.getElementById('enable-advanced-models')?.checked || false;
        
        aiSettings.openrouterApiKey = openrouterKey;
        aiSettings.openaiApiKey = openaiKey;
        aiSettings.model = modelSelect;
        aiSettings.temperature = temperature;
        aiSettings.maxTokens = maxTokens;
        aiSettings.advancedModelsEnabled = advancedEnabled;
        
        if (!aiSettings.advancedModels) aiSettings.advancedModels = {};
        localStorage.setItem('novelfactory_settings', JSON.stringify(aiSettings));
        return true;
    } catch (err) {
        console.error('Error saving settings:', err);
        return false;
    }
}

// Populate settings form fields
function populateSettingsFields() {
    if (document.getElementById('openrouter-api-key')) {
        document.getElementById('openrouter-api-key').value = aiSettings.openrouterApiKey || '';
    }
    if (document.getElementById('openai-api-key')) {
        document.getElementById('openai-api-key').value = aiSettings.openaiApiKey || '';
    }
    if (document.getElementById('model-select')) {
        document.getElementById('model-select').value = aiSettings.model || 'anthropic/claude-sonnet-4';
    }
    if (document.getElementById('temperature')) {
        document.getElementById('temperature').value = aiSettings.temperature || 0.7;
    }
    if (document.getElementById('max-tokens')) {
        document.getElementById('max-tokens').value = aiSettings.maxTokens || 50000;
    }
    
    const enableCheckbox = document.getElementById('enable-advanced-models');
    if (enableCheckbox) enableCheckbox.checked = aiSettings.advancedModelsEnabled || false;
    
    switchApiProvider(aiSettings.apiProvider || 'openrouter');
    
    setTimeout(() => {
        loadSavedAdvancedModels();
        updateAdvancedModelsVisualState();
    }, 200);
    
    updateTempValue();
    updateModelInfo();
}

// Populate form fields from bookData
function populateFormFields() {
    document.getElementById('category').value = bookData.category || '';
    document.getElementById('target-audience').value = bookData.targetAudience || '';
    document.getElementById('topic').value = bookData.topic || '';
    document.getElementById('style-direction').value = bookData.styleDirection || '';
    document.getElementById('style-example').value = bookData.styleExample || '';
    document.getElementById('num-sections').value = bookData.numSections || 20;
    document.getElementById('target-word-count').value = bookData.targetWordCount || 2000;
    
    if (bookData.blueprint) {
        const outlineContent = document.getElementById('blueprint-content');
        if (outlineContent) {
            outlineContent.value = bookData.blueprint;
            saveOutlineContent();
        }
    }
    
    if (bookData.sectionOutline) {
        const sectionsContent = document.getElementById('outline-content');
        if (sectionsContent) {
            sectionsContent.value = bookData.sectionOutline;
            saveOutlineContent();
        }
    }
    
    updateWordCount();
}

// Initialize prompts with defaults
function initializePrompts() {
    if (!aiSettings.customPrompts) aiSettings.customPrompts = {};
    // Outline / Sections / Writing prompts for UI
    if (document.getElementById('outline-prompt')) {
        document.getElementById('outline-prompt').value = aiSettings.customPrompts?.outline || defaultPrompts.outline;
    }
    if (document.getElementById('outline-prompt')) {
        document.getElementById('outline-prompt').value = aiSettings.customPrompts?.outline || defaultPrompts.outline;
    }
    if (document.getElementById('writing-prompt')) {
        document.getElementById('writing-prompt').value = aiSettings.customPrompts?.writing || defaultPrompts.writing;
    }
    // Settings prompts
    if (document.getElementById('settings-blueprint-prompt')) {
        document.getElementById('settings-blueprint-prompt').value = aiSettings.customPrompts?.blueprint || defaultPrompts.blueprint;
    }
    if (document.getElementById('settings-outline-prompt')) {
        document.getElementById('settings-outline-prompt').value = aiSettings.customPrompts?.outline || defaultPrompts.outline;
    }
    if (document.getElementById('settings-writing-prompt')) {
        document.getElementById('settings-writing-prompt').value = aiSettings.customPrompts?.writing || defaultPrompts.writing;
    }
    if (document.getElementById('settings-analysis-prompt')) {
        document.getElementById('settings-analysis-prompt').value = aiSettings.customPrompts?.analysis || defaultPrompts.analysis;
    }
    if (document.getElementById('settings-randomidea-prompt')) {
        document.getElementById('settings-randomidea-prompt').value = aiSettings.customPrompts?.randomIdea || defaultPrompts.randomIdea;
    }
    
    ['blueprint', 'sections', 'writing'].forEach(step => {
        const feedbackPrompt = document.getElementById(`${step}-feedback-prompt`);
        if (feedbackPrompt) {
            feedbackPrompt.value = aiSettings.customPrompts?.analysis || defaultPrompts.analysis;
        }
    });
}

// Save a specific custom prompt
function saveCustomPrompt(promptType) {
    const promptElement = document.getElementById(`settings-${promptType}-prompt`);
    if (!promptElement) return;
    if (!aiSettings.customPrompts) aiSettings.customPrompts = {};
    aiSettings.customPrompts[promptType] = promptElement.value;
    
    // Sync to generation step prompt if exists
    const stepPrompt = document.getElementById(`${promptType}-prompt`);
    if (stepPrompt) stepPrompt.value = promptElement.value;
    
    saveSettings();
}

// Reset a single custom prompt to default
function resetCustomPrompt(promptType) {
    const promptElement = document.getElementById(`settings-${promptType}-prompt`);
    if (promptElement && defaultPrompts[promptType]) {
        promptElement.value = defaultPrompts[promptType];
        saveCustomPrompt(promptType);
    }
}

// Reset all prompts
async function resetAllCustomPrompts() {
    const confirmed = await customConfirm('Are you sure you want to reset all custom prompts to their default values?', 'Reset All Prompts');
    if (!confirmed) return;
    Object.keys(defaultPrompts).forEach(promptType => {
        resetCustomPrompt(promptType);
    });
    await customAlert('All prompts have been reset to default values.', 'Prompts Reset');
}

// Update temperature display value
function updateTempValue() {
    const temp = document.getElementById('temperature').value;
    document.getElementById('temp-value').textContent = temp;
}

// Update model info display
function updateModelInfo() {
    const model = document.getElementById('model-select')?.value;
    const provider = aiSettings.apiProvider;
    const allModels = [...(apiModels[provider]?.Recommended || []), ...(apiModels[provider]?.More || [])];
    const modelInfo = allModels.find(m => m.value === model);
    
    const infoEl = document.getElementById('model-cost-info');
    if (infoEl && modelInfo && modelInfo.cost) {
        infoEl.textContent = `Input: ${modelInfo.cost.input}/1M tokens | Output: ${modelInfo.cost.output}/1M tokens`;
    }
}

// Test API connection
async function testApiConnection() {
    const statusDiv = document.getElementById('api-status');
    statusDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Testing connection...</div>';
    try {
        const response = await callAI("Respond with 'Connection successful!' if you can read this message.", "");
        statusDiv.innerHTML = '<div class="success">Connection successful!</div>';
    } catch (err) {
        statusDiv.innerHTML = `<div class="error">Connection failed: ${err.message}</div>`;
    }
}

// Export AI/settings
function exportSettings() {
    const settings = {
        aiSettings: aiSettings,
        prompts: {
            blueprint: document.getElementById('settings-blueprint-prompt')?.value || defaultPrompts.blueprint,
            outline: document.getElementById('settings-outline-prompt')?.value || defaultPrompts.outline,
            writing: document.getElementById('settings-writing-prompt')?.value || defaultPrompts.writing,
            analysis: document.getElementById('settings-analysis-prompt')?.value || defaultPrompts.analysis,
            randomIdea: document.getElementById('settings-randomidea-prompt')?.value || defaultPrompts.randomIdea
        },
        version: CONFIG.VERSION,
        exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'novelfactory-ai-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Import AI/settings
function importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const settings = JSON.parse(e.target.result);
                if (settings.aiSettings) {
                    Object.assign(aiSettings, settings.aiSettings);
                    populateSettingsFields();
                }
                if (settings.prompts) {
                    Object.entries(settings.prompts).forEach(([type, prompt]) => {
                        const element = document.getElementById(`settings-${type}-prompt`);
                        if (element) element.value = prompt;
                    });
                }
                saveSettings();
                await customAlert('Settings imported successfully!', 'Settings Imported');
            } catch (err) {
                await customAlert('Error importing settings: Invalid file format', 'Import Error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// Estimate generation costs
async function estimateCosts() {
    const numSections = bookData.numSections || 20;
    const targetWordCount = bookData.targetWordCount || 2000;
    
    // Get current model pricing
    const currentModel = aiSettings.model;
    const provider = aiSettings.apiProvider || 'openrouter';
    const allModels = [...(apiModels[provider]?.Recommended || []), ...(apiModels[provider]?.More || [])];
    const modelInfo = allModels.find(m => m.value === currentModel);
    
    if (!modelInfo || !modelInfo.cost) {
        await customAlert('Cost information not available for the selected model.', 'Cost Estimation');
        return;
    }
    
    const { input: inputCostPer1M, output: outputCostPer1M } = modelInfo.cost;
    
    // Estimate token usage (rough approximation: 1 word ≈ 1.3 tokens)
    const wordsToTokens = (words) => Math.ceil(words * 1.3);
    
    // Input tokens estimation
    const premiseTokens = wordsToTokens((bookData.topic || '').split(' ').length);
    const styleTokens = wordsToTokens((bookData.styleDirection || '').split(' ').length);
    const basePromptTokens = 7500; // Estimated tokens for prompts and instructions
    
    // Story bible generation
    const outlineInputTokens = basePromptTokens + premiseTokens + styleTokens;
    const outlineOutputTokens = wordsToTokens(3000);
    
    // Section outline generation
    const sectionsInputTokens = basePromptTokens + outlineOutputTokens;
    const sectionsOutputTokens = wordsToTokens(6000);
    
    // Section writing
    const singleSectionInputTokens = basePromptTokens + Math.floor((outlineOutputTokens + sectionsOutputTokens) / 4);
    const singleSectionOutputTokens = wordsToTokens(targetWordCount);
    const totalSectionInputTokens = singleSectionInputTokens * numSections;
    const totalSectionOutputTokens = singleSectionOutputTokens * numSections;
    
    // Total tokens
    const totalInputTokens = outlineInputTokens + sectionsInputTokens + totalSectionInputTokens;
    const totalOutputTokens = outlineOutputTokens + sectionsOutputTokens + totalSectionOutputTokens;
    
    // Calculate costs (costs are per 1M tokens)
    const totalInputCostEst = (totalInputTokens / 1000000) * inputCostPer1M;
    const totalOutputCostEst = (totalOutputTokens / 1000000) * outputCostPer1M;
    const totalCost = totalInputCostEst + totalOutputCostEst;
    
    // Time estimation based on typical model speeds (tokens per second)
    const modelSpeeds = {
        'anthropic/claude-sonnet-4': { inputTPS: 5000, outputTPS: 50 },
        'anthropic/claude-opus-4.1': { inputTPS: 4000, outputTPS: 35 },
        'openai/gpt-5': { inputTPS: 6000, outputTPS: 60 },
        'openai/gpt-4o': { inputTPS: 7000, outputTPS: 80 },
        'anthropic/claude-3.7-sonnet:thinking': { inputTPS: 4500, outputTPS: 45 },
        'google/gemini-2.5-pro': { inputTPS: 8000, outputTPS: 100 },
        'anthropic/claude-3.5-sonnet': { inputTPS: 5500, outputTPS: 55 }
    };
    
    // Default speeds for unknown models
    const defaultSpeed = { inputTPS: 5000, outputTPS: 50 };
    const modelSpeed = modelSpeeds[currentModel] || defaultSpeed;
    
    // Calculate time estimates (in seconds)
    const inputProcessingTime = totalInputTokens / modelSpeed.inputTPS;
    const outputGenerationTime = totalOutputTokens / modelSpeed.outputTPS;
    const totalGenerationTime = inputProcessingTime + outputGenerationTime;
    
    // Add buffer time for API latency and processing (20% overhead)
    const totalTimeWithOverhead = totalGenerationTime * 1.2;
    
    // Convert to human-readable format
    const formatTime = (seconds) => {
        if (seconds < 60) return `${Math.round(seconds)} seconds`;
        if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
        
        // For over an hour, show hours and minutes
        const hours = Math.floor(seconds / 3600);
        const remainingMinutes = Math.round((seconds % 3600) / 60);
        
        if (remainingMinutes === 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        } else {
            return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
        }
    };
    
    const costText = `<div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.6; color: #374151;">
<h2 style="color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">Cost & Time Estimation</h2>

<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
<h3 style="color: #1f2937; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">Selected Model</h3>
<p style="margin: 0; font-weight: 500; color: #2563eb;">${modelInfo.label}</p>
</div>

<div style="background: #fefefe; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
<h3 style="color: #1f2937; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">Book Specifications</h3>
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
  <div><span style="color: #6b7280;">Sections:</span> <strong>${numSections}</strong></div>
  <div><span style="color: #6b7280;">Words/Section:</span> <strong>${targetWordCount.toLocaleString()}</strong></div>
  <div style="grid-column: 1/-1;"><span style="color: #6b7280;">Total Length:</span> <strong>${(numSections * targetWordCount).toLocaleString()} words</strong></div>
</div>
</div>

<div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin: 16px 0;">
<h3 style="color: #c2410c; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">Cost Breakdown</h3>
<div style="font-size: 13px; margin-bottom: 12px;">
  <div style="display: flex; justify-content: space-between; margin: 4px 0;">
    <span style="color: #78716c;">Input Tokens:</span> 
    <span style="font-weight: 500;">${totalInputTokens.toLocaleString()}</span>
  </div>
  <div style="display: flex; justify-content: space-between; margin: 4px 0;">
    <span style="color: #78716c;">Output Tokens:</span> 
    <span style="font-weight: 500;">${totalOutputTokens.toLocaleString()}</span>
  </div>
</div>
<div style="border-top: 1px solid #fed7aa; padding-top: 8px; font-size: 13px;">
  <div style="display: flex; justify-content: space-between; margin: 4px 0;">
    <span style="color: #78716c;">Input Cost:</span> 
    <span style="font-weight: 500;">$${totalInputCostEst.toFixed(2)}</span>
  </div>
  <div style="display: flex; justify-content: space-between; margin: 4px 0;">
    <span style="color: #78716c;">Output Cost:</span> 
    <span style="font-weight: 500;">$${totalOutputCostEst.toFixed(2)}</span>
  </div>
  <div style="display: flex; justify-content: space-between; margin: 8px 0 0 0; font-size: 16px; font-weight: 700; color: #c2410c;">
    <span>TOTAL COST:</span> 
    <span>$${totalCost.toFixed(2)}</span>
  </div>
</div>
</div>

<div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0;">
<h3 style="color: #0369a1; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">Time Estimation</h3>
<div style="font-size: 13px;">
  <div style="display: flex; justify-content: space-between; margin: 4px 0;">
    <span style="color: #475569;">Processing:</span> 
    <span style="font-weight: 500;">${formatTime(inputProcessingTime)}</span>
  </div>
  <div style="display: flex; justify-content: space-between; margin: 4px 0;">
    <span style="color: #475569;">Generation:</span> 
    <span style="font-weight: 500;">${formatTime(outputGenerationTime)}</span>
  </div>
  <div style="display: flex; justify-content: space-between; margin: 8px 0 0 0; font-size: 15px; font-weight: 600; color: #0369a1;">
    <span>TOTAL TIME:</span> 
    <span>${formatTime(totalTimeWithOverhead)}</span>
  </div>
  <div style="font-size: 11px; color: #64748b; margin-top: 4px; font-style: italic;">
    (includes 20% processing buffer)
  </div>
</div>
</div>

<div style="background: #f9fafb; border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; margin: 16px 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
<strong>Note:</strong> Estimates are based on typical model performance and token usage patterns without feedback loops. Actual costs and times may vary depending on content complexity, API load, and generation quality requirements.
</div>
</div>`;
    
    await customAlert(costText, 'Cost Estimation');
}

// ==================================================
// UTILITY FUNCTIONS
// ==================================================

// Word counting
function countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function updateWordCount() {
    const premise = document.getElementById('topic')?.value || '';
    const style = document.getElementById('style-direction')?.value || '';
    const styleExcerpt = document.getElementById('style-example')?.value || '';
    document.getElementById('topic-word-count').textContent = `${countWords(premise)} words`;
    document.getElementById('style-word-count').textContent = `${countWords(style)} words`;
    if (document.getElementById('style-example-word-count')) {
        document.getElementById('style-example-word-count').textContent = `${countWords(styleExcerpt)} words`;
    }
}

// Section estimate
function updateSectionEstimate() {
    const numSections = parseInt(document.getElementById('num-sections').value) || 20;
    const targetWords = parseInt(document.getElementById('target-word-count').value) || 2000;
    const totalWords = numSections * targetWords;
    document.getElementById('section-estimate').textContent = `Estimated book length: ~${totalWords.toLocaleString()} words`;
}

// Genre/Audience requirements
function updateCategoryRequirements() {
    const genre = document.getElementById('category').value;
    const requirementsDiv = document.getElementById('category-requirements');
    const contentDiv = document.getElementById('category-requirements-content');
    if (genre && categoryRequirements[genre]) {
        const req = categoryRequirements[genre];
        contentDiv.innerHTML = `<p><strong>Genre Requirements:</strong> ${req.requirements}</p><p><strong>Pacing Guidelines:</strong> ${req.pacing}</p>`;
        requirementsDiv.style.display = 'block';
    } else {
        requirementsDiv.style.display = 'none';
    }
}

// Audience requirements (recomputes length)
function updateAudienceRequirements() {
    updateSectionEstimate();
}

// Auto-save system
function setupAutoSave() {
    setInterval(autoSave, CONFIG.AUTO_SAVE_INTERVAL);
}

function autoSave() {
    if (bookData.topic || bookData.styleDirection || bookData.blueprint) {
        collectBookData();
        saveToLocalStorage();
        showAutoSaveIndicator();
    }
}

function showAutoSaveIndicator() {
    const indicator = document.getElementById('auto-save-indicator');
    indicator.classList.add('show');
    setTimeout(() => indicator.classList.remove('show'), 1000);
}

function saveToLocalStorage() {
    bookData.lastSaved = new Date().toISOString();
    localStorage.setItem('novelfactory_currentProject', JSON.stringify(bookData));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('novelfactory_currentProject');
    if (saved) {
        const savedData = JSON.parse(saved);
        Object.assign(bookData, savedData);
        populateFormFields();
    }
}

// Donation
function showDonationModal() {
    document.getElementById('donation-modal').style.display = 'flex';
}
function closeDonationModal() {
    document.getElementById('donation-modal').style.display = 'none';
}
function setDonationAmount(amount) {
    selectedDonationAmount = amount;
    document.querySelectorAll('.donation-amount').forEach(btn => btn.classList.remove('selected'));
    event?.target?.classList.add('selected');
    document.getElementById('donate-btn').innerHTML = `<span class="label">Donate ${amount}</span>`;
    document.getElementById('custom-donation-amount').value = '';
}
async function proceedToDonate() {
    const customAmount = document.getElementById('custom-donation-amount').value;
    const amount = customAmount || selectedDonationAmount;
    if (!amount || amount < 1) {
        await customAlert('Please select or enter a valid donation amount.', 'Invalid Amount');
        return;
    }
    const paypalUrl = `https://www.paypal.com/donate/?hosted_button_id=&business=dietrichandreas2%40t-online.de&amount=${amount}&currency_code=USD&item_name=BookForge%20Donation`;
    window.open(paypalUrl, '_blank');
    closeDonationModal();
    setTimeout(async () => {
        await customAlert('Thank you for supporting BookForge! Your generosity helps keep this tool free for everyone.', 'Thank You!');
    }, 1000);
}


// Feedback
function showFeedbackForm() {
    document.getElementById('feedback-modal').style.display = 'flex';
}
function closeFeedbackModal() {
    document.getElementById('feedback-modal').style.display = 'none';
    document.getElementById('feedback-type').value = 'bug';
    document.getElementById('feedback-message').value = '';
}
async function submitFeedback() {
    const type = document.getElementById('feedback-type').value;
    const message = document.getElementById('feedback-message').value;
    
    if (!message.trim()) {
        await customAlert('Please enter your feedback message.', 'Missing Information');
        return;
    }
    
    const subject = `BookForge Feedback: ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const body = `Feedback Type: ${type}\n\nMessage:\n${message}\n\n---\nSent from BookForge v${CONFIG.VERSION} (https://bookforge.net)`;
    const mailtoLink = `mailto:dietrichandreas2@t-online.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    window.location.href = mailtoLink;
    closeFeedbackModal();
    await customAlert('Thank you for your feedback! Your default email client should open with your message.', 'Feedback Sent');
}

// One-Click and modals (existing patterns continued)
function showLoadingOverlay(text) {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading-overlay').style.display = 'flex';
    document.getElementById('cancel-btn').style.display = 'inline-flex';
}
function updateLoadingText(text) {
    document.getElementById('loading-text').textContent = text;
}
function hideLoadingOverlay() {
    document.getElementById('loading-overlay').style.display = 'none';
    document.getElementById('cancel-btn').style.display = 'none';
    isGenerating = false;
}

// Cancellation and modal helpers
function closeOneClickModal() {
    document.getElementById('one-click-modal').style.display = 'none';
}
async function closeCustomAlertWindow() { await closeCustomAlert(true); }

// INITIALIZATION
function initializeApp() {
    console.log(`BookForge v${CONFIG.VERSION} - Initializing...`);
    
    // Load or initialize settings
    if (!window.aiSettings) {
        window.aiSettings = aiSettings;
    }
    
    loadSettings();
    loadProjects();
    
    setupEventListeners();
    setupAutoSave();
    
    initializePrompts();
    updateModelSelect();
    updateNavProgress();
    updateUndoRedoButtons();
    
    // Feedback modes initial state
    ['blueprint', 'sections', 'writing'].forEach(step => {
        const sel = document.getElementById(`${step}-feedback-mode`);
        if (sel) {
            sel.value = 'ai';
            toggleManualFeedback(step);
        }
    });
    
    // Theme
    const savedTheme = localStorage.getItem('novelfactory_theme') || 'light';
    // Ensure theme is valid (fallback from removed 'fun' theme)
    const validTheme = themes.includes(savedTheme) ? savedTheme : 'light';
    setTheme(validTheme);
    
    // Collapse sections default
    document.querySelectorAll('.collapsible-content').forEach(content => {
        content.style.display = 'none';
    });
    
    console.log('BookForge initialization complete');
}

// ==================================================
// UNDO/REDO SYSTEM
// ==================================================

/**
 * Save current state for undo functionality
 * @param {string} actionDescription - Description of the action
 */
function saveStateForUndo(actionDescription = 'Action') {
    const currentState = {
        bookData: JSON.parse(JSON.stringify(bookData)),
        description: actionDescription,
        timestamp: Date.now()
    };
    
    undoStack.push(currentState);
    
    // Limit undo stack size
    if (undoStack.length > MAX_UNDO_STATES) {
        undoStack.shift();
    }
    
    // Clear redo stack when new action is performed
    redoStack = [];
    
    updateUndoRedoButtons();
}

/**
 * Undo the last action
 */
function undoAction() {
    if (undoStack.length === 0) return;
    
    // Save current state to redo stack
    const currentState = {
        bookData: JSON.parse(JSON.stringify(bookData)),
        description: 'Current State',
        timestamp: Date.now()
    };
    redoStack.push(currentState);
    
    // Get and apply previous state
    const previousState = undoStack.pop();
    bookData = JSON.parse(JSON.stringify(previousState.bookData));
    
    // Update UI
    populateFormFields();
    setupWritingInterface();
    saveToLocalStorage();
    
    updateUndoRedoButtons();
}

/**
 * Redo the last undone action
 */
function redoAction() {
    if (redoStack.length === 0) return;
    
    // Save current state to undo stack
    const currentState = {
        bookData: JSON.parse(JSON.stringify(bookData)),
        description: 'Current State',  
        timestamp: Date.now()
    };
    undoStack.push(currentState);
    
    // Get and apply next state
    const nextState = redoStack.pop();
    bookData = JSON.parse(JSON.stringify(nextState.bookData));
    
    // Update UI
    populateFormFields();
    setupWritingInterface();
    saveToLocalStorage();
    
    updateUndoRedoButtons();
}

/**
 * Update undo/redo button states
 */
function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    
    if (undoBtn) {
        undoBtn.disabled = undoStack.length === 0;
        undoBtn.title = undoStack.length > 0 ? 
            `Undo: ${undoStack[undoStack.length - 1].description}` : 
            'No actions to undo';
    }
    
    if (redoBtn) {
        redoBtn.disabled = redoStack.length === 0;
        redoBtn.title = redoStack.length > 0 ? 
            `Redo: ${redoStack[redoStack.length - 1].description}` : 
            'No actions to redo';
    }
}

// DOM ready
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function setupModalEventListeners() {
    // Custom input modal event listeners
    document.getElementById('input-ok-btn').addEventListener('click', () => {
        const value = document.getElementById('input-field').value;
        closeCustomInput(value);
    });
    
    document.getElementById('input-cancel-btn').addEventListener('click', () => {
        closeCustomInput(null);
    });
    
    // Add keyboard support for input field
    document.getElementById('input-field').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const value = document.getElementById('input-field').value;
            closeCustomInput(value);
        } else if (e.key === 'Escape') {
            closeCustomInput(null);
        }
    });
}

// On full page load
window.addEventListener('load', function() {
    loadFromLocalStorage();
    updateWordCount();
    updateSectionEstimate();
    updateModelInfo();
    updateNavProgress();
    setupModalEventListeners();
});

// Auto-save on unload
window.addEventListener('beforeunload', function() {
    autoSave();
});

// Global error handling
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    
    // Clean up any active loading states
    if (document.getElementById('loading-overlay')?.style.display !== 'none') {
        hideLoadingOverlay();
    }
    
    // Clean up generation indicator if it's showing
    if (isGenerating || document.getElementById('generation-indicator')?.style.display === 'flex') {
        hideGenerationInfo();
    }
    
    // Show error to user if in an active process
    if (document.getElementById('loading-overlay')?.style.display !== 'none' || isGenerating) {
        customAlert('An unexpected error occurred. Please try again.', 'Error');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    
    // Clean up generation states
    if (isGenerating) {
        hideGenerationInfo();
    }
});

// Network status
window.addEventListener('online', function() {
    console.log('Connection restored');
});
window.addEventListener('offline', function() {
    customAlert('You appear to be offline. Some features may not work until connection is restored.', 'Connection Issue');
});

// Development helpers
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.bookData = bookData;
    window.aiSettings = aiSettings;
    window.CONFIG = CONFIG;
    console.log('Development mode: Global variables exposed for debugging');
}

// ==================================================
// MISSING FUNCTIONS
// ==================================================

/**
 * Reset everything and start a new project
 */
async function resetEverything() {
    const confirmed = await customConfirm('This will clear all current work and start fresh. Are you sure?', 'Reset Everything');
    if (!confirmed) return;
    
    // Reset book data
    bookData = {
        id: 'current',
        title: '',
        blurb: '',
        category: '',
        targetAudience: '',
        premise: '',
        styleDirection: '',
        styleExcerpt: '',
        numSections: 20,
        targetWordCount: 2000,
        outline: '',
        sectionOutline: '',
        sections: [],
        currentStep: 'setup',
        createdAt: new Date().toISOString(),
        lastSaved: new Date().toISOString()
    };
    
    // Clear all form fields
    document.getElementById('category').value = '';
    document.getElementById('target-audience').value = '';
    document.getElementById('topic').value = '';
    document.getElementById('style-direction').value = '';
    document.getElementById('style-example').value = '';
    document.getElementById('num-sections').value = '20';
    document.getElementById('target-word-count').value = '2000';
    document.getElementById('blueprint-content').value = '';
    document.getElementById('outline-content').value = '';
    
    // Clear sections container
    const container = document.getElementById('sections-container');
    if (container) {
        container.innerHTML = '<div class="writing-placeholder"><p>Setting up writing interface...</p></div>';
    }
    
    // Reset navigation
    showStep('setup');
    updateNavProgress();
    updateWordCount();
    updateSectionEstimate();
    
    // Save the reset state
    autoSave();
    
    await customAlert('Everything has been reset. You can now start a new project.', 'Reset Complete');
}

/**
 * Show generation progress info
 * @param {string} message - Progress message
 */
function showGenerationInfo(message = '') {
    // Don't show generation indicator if loading overlay is already active
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay && loadingOverlay.style.display === 'flex') {
        // Update loading overlay text instead
        if (message) {
            document.getElementById('loading-text').textContent = message;
        }
        return;
    }
    
    const indicator = document.getElementById('generation-indicator');
    if (!indicator) return;
    
    if (message) {
        document.getElementById('generation-description').textContent = message;
    }
    
    indicator.style.display = 'flex';
    
    // Show cancel button for one-click generation (check if oneClickCancelled flag is actively being used)
    const cancelBtn = document.getElementById('generation-cancel-btn');
    if (cancelBtn && window.oneClickInProgress) {
        cancelBtn.style.display = 'block';
    }
    
    // Safety timeout to auto-hide after 5 minutes if not properly cleaned up
    clearTimeout(window.generationTimeout);
    window.generationTimeout = setTimeout(() => {
        console.warn('Generation indicator auto-hidden after timeout');
        hideGenerationInfo();
    }, 300000); // 5 minutes
}

/**
 * Hide generation progress info
 */
function hideGenerationInfo() {
    // Clear the safety timeout
    clearTimeout(window.generationTimeout);
    
    // Don't hide if loading overlay is active (let loading overlay handle the display)
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay && loadingOverlay.style.display === 'flex') {
        return;
    }
    
    const indicator = document.getElementById('generation-indicator');
    if (indicator) {
        indicator.style.display = 'none';
        // Force hide with important style as backup
        indicator.style.setProperty('display', 'none', 'important');
    }
    
    // Hide cancel button
    const cancelBtn = document.getElementById('generation-cancel-btn');
    if (cancelBtn) {
        cancelBtn.style.display = 'none';
    }
    
    // Always reset the generating state
    isGenerating = false;
    
    // Remove any potential ai-generating class from body
    document.body.classList.remove('ai-generating');
}

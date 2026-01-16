#!/bin/bash

# Ralph Wiggum V3 - Main Execution Engine
# Autonomous AI Development Loop System

set -e

# ====================================
# Configuration
# ====================================

RALPH_DIR="${RALPH_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
PROJECT_PATH="${PROJECT_PATH:-$(dirname "$RALPH_DIR")}"
COST_LIMIT="${COST_LIMIT:-50}"
MAX_RUNTIME="${MAX_RUNTIME:-14400}"
COMPLETION_PROMISE="${COMPLETION_PROMISE:-ALL_TASKS_COMPLETE}"
DRY_RUN="${DRY_RUN:-false}"
BACKOFF_ENABLED="${BACKOFF_ENABLED:-true}"
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"

# Output files
LOG_FILE="${PROJECT_PATH}/ralph.log"
HEALTH_LOG="${PROJECT_PATH}/ralph-health.log"
METRICS_FILE="${PROJECT_PATH}/ralph-metrics.json"

# State tracking
ITERATION=0
MAX_ITERATIONS="${2:-100}"
CONSECUTIVE_FAILURES=0
LOOP_START_TIME=$(date +%s)
LAST_OUTPUT=""

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ====================================
# Logging Functions
# ====================================

log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $1" | tee -a "$LOG_FILE"
}

log_health() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $1" >> "$HEALTH_LOG"
}

# ====================================
# Validation Functions
# ====================================

validate_config() {
    if [ ! -f "${PROJECT_PATH}/AGENTS.md" ]; then
        log "WARNING: AGENTS.md not found in ${PROJECT_PATH}"
        log_health "VALIDATION: AGENTS.md missing"
        return 1
    fi

    # Check for placeholder commands
    if grep -q "\[build-command\]" "${PROJECT_PATH}/AGENTS.md" 2>/dev/null; then
        log "WARNING: AGENTS.md contains placeholder commands"
        log_health "VALIDATION: AGENTS.md has placeholder commands"
        return 1
    fi

    log_health "VALIDATION: Config OK"
    return 0
}

# ====================================
# Cost Tracking
# ====================================

check_cost_limit() {
    # Cost is tracked by the dashboard via stream-json parsing
    # This function can read from a cost file if needed

    if [ -f "${PROJECT_PATH}/.ralph-cost" ]; then
        local current_cost=$(cat "${PROJECT_PATH}/.ralph-cost" 2>/dev/null || echo "0")
        if (( $(echo "$current_cost >= $COST_LIMIT" | bc -l 2>/dev/null || echo "0") )); then
            log "Cost limit exceeded: \$$current_cost >= \$$COST_LIMIT"
            return 1
        fi
    fi
    return 0
}

# ====================================
# Runtime Tracking
# ====================================

check_runtime_limit() {
    local elapsed=$(($(date +%s) - LOOP_START_TIME))
    if [ "$elapsed" -ge "$MAX_RUNTIME" ]; then
        local hours=$((elapsed / 3600))
        local minutes=$(((elapsed % 3600) / 60))
        log "Runtime limit exceeded: ${hours}h ${minutes}m >= $((MAX_RUNTIME / 3600))h $((MAX_RUNTIME % 3600 / 60))m"
        return 1
    fi
    return 0
}

# ====================================
# Loop Detection
# ====================================

detect_stuck_loop() {
    local current_output="$1"

    # Simple stuck loop detection based on consecutive failures
    if [ "$CONSECUTIVE_FAILURES" -ge 3 ]; then
        log_health "STUCK_LOOP: $CONSECUTIVE_FAILURES consecutive failures detected"
        return 0
    fi

    # Note: Fuzzy string matching is handled by the dashboard's loopController
    return 1
}

# ====================================
# Backoff & Recovery
# ====================================

apply_backoff() {
    if [ "$BACKOFF_ENABLED" != "true" ]; then
        return
    fi

    if [ "$CONSECUTIVE_FAILURES" -gt 0 ]; then
        local backoff=$((2 ** CONSECUTIVE_FAILURES))
        if [ "$backoff" -gt 60 ]; then
            backoff=60
        fi
        log "Backing off for ${backoff}s before retry..."
        log_health "BACKOFF: ${backoff}s (failures: $CONSECUTIVE_FAILURES)"
        sleep "$backoff"
    fi
}

rollback_state() {
    if [ "$ROLLBACK_ON_FAILURE" != "true" ]; then
        return
    fi

    if [ "$CONSECUTIVE_FAILURES" -ge 3 ]; then
        log "Rolling back to last successful checkpoint..."
        log_health "ROLLBACK: git reset --hard HEAD~1"
        cd "$PROJECT_PATH"
        git reset --hard HEAD~1 2>/dev/null || true
        CONSECUTIVE_FAILURES=0
    fi
}

# ====================================
# Build Mode
# ====================================

run_build() {
    local iteration=$1
    log "Starting build iteration $iteration"
    log_health "BUILD: Iteration $iteration started"

    # Build the prompt
    local prompt_file="${RALPH_DIR}/PROMPT_build.md"
    if [ ! -f "$prompt_file" ]; then
        prompt_file="${PROJECT_PATH}/PROMPT_build.md"
    fi

    # Create dynamic prompt if template doesn't exist
    if [ ! -f "$prompt_file" ]; then
        local temp_prompt="/tmp/ralph_prompt_$$.md"
        cat > "$temp_prompt" << 'EOF'
Read AGENTS.md for project configuration and build commands.
Read IMPLEMENTATION_PLAN.md for the current task list.

Execute the highest priority incomplete task:
1. Implement the task completely
2. Run validation commands from AGENTS.md
3. If validation passes, commit with: git add -A && git commit -m "feat: [task summary]"
4. Update IMPLEMENTATION_PLAN.md to mark task complete

If ALL tasks are complete, output: ALL_TASKS_COMPLETE
EOF
        prompt_file="$temp_prompt"
    fi

    cd "$PROJECT_PATH"

    # Run Claude CLI
    local output
    if [ "$DRY_RUN" = "true" ]; then
        log "[DRY RUN] Would execute: claude -p $prompt_file"
        log "[DRY RUN] In directory: $PROJECT_PATH"
        output="[DRY RUN] Simulated output"
    else
        # Execute Claude CLI with stream-json output for cost tracking
        output=$(claude -p "$prompt_file" --output-format=stream-json 2>&1) || true
    fi

    # Check for completion signal
    if echo "$output" | grep -q "$COMPLETION_PROMISE"; then
        log "Completion signal detected: $COMPLETION_PROMISE"
        return 0
    fi

    # Store output for loop detection
    LAST_OUTPUT="$output"

    return 1
}

# ====================================
# Plan Modes
# ====================================

run_plan() {
    local mode="${1:-standard}"
    log "Running plan mode: $mode"

    local prompt_file
    case "$mode" in
        slc|plan-slc)
            prompt_file="${RALPH_DIR}/PROMPT_plan_slc.md"
            ;;
        work|plan-work)
            # Check branch
            local branch=$(git branch --show-current 2>/dev/null)
            if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
                log "ERROR: plan-work mode cannot run on main/master branch"
                return 1
            fi
            prompt_file="${RALPH_DIR}/PROMPT_plan_work.md"
            ;;
        *)
            prompt_file="${RALPH_DIR}/PROMPT_plan.md"
            ;;
    esac

    if [ ! -f "$prompt_file" ]; then
        log "ERROR: Prompt file not found: $prompt_file"
        return 1
    fi

    cd "$PROJECT_PATH"

    if [ "$DRY_RUN" = "true" ]; then
        log "[DRY RUN] Would execute: claude -p $prompt_file"
        return 0
    fi

    claude -p "$prompt_file" --output-format=stream-json 2>&1 | tee -a "$LOG_FILE"
    return 0
}

# ====================================
# Review Mode
# ====================================

run_review() {
    log "Running code review mode"

    local prompt_file="${RALPH_DIR}/PROMPT_review.md"
    if [ ! -f "$prompt_file" ]; then
        log "ERROR: Review prompt not found: $prompt_file"
        return 1
    fi

    cd "$PROJECT_PATH"

    if [ "$DRY_RUN" = "true" ]; then
        log "[DRY RUN] Would execute: claude -p $prompt_file"
        return 0
    fi

    claude -p "$prompt_file" --output-format=stream-json 2>&1 | tee -a "$LOG_FILE"
    return 0
}

# ====================================
# Main Loop
# ====================================

main_loop() {
    local mode="${1:-build}"

    log "Starting Ralph Wiggum V3 loop"
    log "Mode: $mode"
    log "Project: $PROJECT_PATH"
    log "Max iterations: $MAX_ITERATIONS"
    log "Cost limit: \$$COST_LIMIT"
    log "Max runtime: $((MAX_RUNTIME / 3600))h $((MAX_RUNTIME % 3600 / 60))m"

    # Validate configuration
    validate_config || log "WARNING: Configuration validation failed, proceeding anyway"

    # Handle non-build modes
    case "$mode" in
        plan|plan-slc|plan-work)
            run_plan "$mode"
            exit $?
            ;;
        review)
            run_review
            exit $?
            ;;
    esac

    # Build loop
    while [ $ITERATION -lt $MAX_ITERATIONS ]; do
        ITERATION=$((ITERATION + 1))

        echo ""
        echo -e "${BLUE}========================================${NC}"
        echo -e "${BLUE}  Iteration $ITERATION / $MAX_ITERATIONS${NC}"
        echo -e "${BLUE}========================================${NC}"
        echo ""

        # Check limits
        if ! check_runtime_limit; then
            log "Exiting: Runtime limit reached"
            exit 2
        fi

        if ! check_cost_limit; then
            log "Exiting: Cost limit reached"
            exit 3
        fi

        # Apply backoff if needed
        apply_backoff

        # Run build iteration
        if run_build $ITERATION; then
            log "Build complete - all tasks done!"
            echo ""
            echo -e "${GREEN}========================================${NC}"
            echo -e "${GREEN}  ALL_TASKS_COMPLETE${NC}"
            echo -e "${GREEN}========================================${NC}"
            exit 0
        fi

        # Check for stuck loop
        if detect_stuck_loop "$LAST_OUTPUT"; then
            log_health "WARNING: Stuck loop detected at iteration $ITERATION"
            CONSECUTIVE_FAILURES=$((CONSECUTIVE_FAILURES + 1))
            rollback_state
        else
            CONSECUTIVE_FAILURES=0
        fi

        log_health "ITERATION: $ITERATION completed, failures: $CONSECUTIVE_FAILURES"
    done

    log "Max iterations ($MAX_ITERATIONS) reached"
    exit 1
}

# ====================================
# Entry Point
# ====================================

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Ralph Wiggum V3                  ║${NC}"
echo -e "${BLUE}║   Autonomous AI Development Loop       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Parse arguments
MODE="${1:-build}"
MAX_ITERATIONS="${2:-100}"

# Start the loop
main_loop "$MODE"

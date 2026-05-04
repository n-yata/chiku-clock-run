FROM mcr.microsoft.com/devcontainers/base:ubuntu-22.04

# --- Node.js 20 (LTS) ---
ARG NODE_VERSION=20
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# --- GitHub CLI (gh) ---
# 公式手順: https://github.com/cli/cli/blob/trunk/docs/install_linux.md
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
        | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
        > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update \
    && apt-get install -y gh \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# --- Claude Code CLI ---
RUN npm install -g @anthropic-ai/claude-code

# --- VS Code CLI (Remote Tunnel 用) ---
# コンテナ内では sudo・code コマンドが使えないため、スタンドアロン CLI を事前インストール。
# "code-tunnel" コマンドとして利用可能にする。
RUN curl -fsSL 'https://code.visualstudio.com/sha/download?build=stable&os=cli-alpine-x64' \
        --output /tmp/vscode_cli.tar.gz \
    && tar -xf /tmp/vscode_cli.tar.gz -C /usr/local/bin \
    && mv /usr/local/bin/code /usr/local/bin/code-tunnel \
    && rm /tmp/vscode_cli.tar.gz

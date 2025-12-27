#!/bin/bash
# Blue-Green 部署脚本
# 用法: ./blue-green-deploy.sh <新版本镜像>

set -e

NEW_IMAGE="${1:-foresight/relayer:latest}"
NAMESPACE="${NAMESPACE:-default}"
TIMEOUT="${TIMEOUT:-300}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 获取当前活跃的颜色
get_active_color() {
    kubectl get service foresight-relayer-prod -n $NAMESPACE -o jsonpath='{.spec.selector.color}' 2>/dev/null || echo "blue"
}

# 获取非活跃的颜色
get_inactive_color() {
    local active=$(get_active_color)
    if [ "$active" == "blue" ]; then
        echo "green"
    else
        echo "blue"
    fi
}

# 等待部署就绪
wait_for_deployment() {
    local deployment=$1
    local timeout=$2
    
    log_info "等待部署 $deployment 就绪..."
    kubectl rollout status deployment/$deployment -n $NAMESPACE --timeout=${timeout}s
}

# 健康检查
health_check() {
    local service=$1
    local retries=10
    local wait=5
    
    log_info "执行健康检查..."
    
    for ((i=1; i<=retries; i++)); do
        local pod=$(kubectl get pods -n $NAMESPACE -l app=foresight-relayer,color=$1 -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
        
        if [ -n "$pod" ]; then
            local health=$(kubectl exec -n $NAMESPACE $pod -- curl -s http://localhost:3000/health 2>/dev/null | jq -r '.status' 2>/dev/null)
            
            if [ "$health" == "healthy" ] || [ "$health" == "degraded" ]; then
                log_info "健康检查通过"
                return 0
            fi
        fi
        
        log_warn "健康检查失败，重试 $i/$retries..."
        sleep $wait
    done
    
    log_error "健康检查失败"
    return 1
}

# 主流程
main() {
    log_info "开始 Blue-Green 部署"
    log_info "新镜像: $NEW_IMAGE"
    
    local active_color=$(get_active_color)
    local inactive_color=$(get_inactive_color)
    
    log_info "当前活跃环境: $active_color"
    log_info "目标部署环境: $inactive_color"
    
    # 1. 更新非活跃部署的镜像
    log_info "更新 $inactive_color 环境镜像..."
    kubectl set image deployment/foresight-relayer-$inactive_color \
        relayer=$NEW_IMAGE \
        -n $NAMESPACE
    
    # 2. 扩展非活跃部署
    log_info "扩展 $inactive_color 环境..."
    kubectl scale deployment foresight-relayer-$inactive_color \
        --replicas=3 \
        -n $NAMESPACE
    
    # 3. 等待部署就绪
    wait_for_deployment "foresight-relayer-$inactive_color" $TIMEOUT
    
    # 4. 健康检查
    if ! health_check $inactive_color; then
        log_error "新版本健康检查失败，回滚..."
        kubectl scale deployment foresight-relayer-$inactive_color --replicas=0 -n $NAMESPACE
        exit 1
    fi
    
    # 5. 切换流量
    log_info "切换流量到 $inactive_color..."
    kubectl patch service foresight-relayer-prod \
        -n $NAMESPACE \
        -p "{\"spec\":{\"selector\":{\"color\":\"$inactive_color\"}}}"
    
    # 6. 等待流量切换完成
    sleep 10
    
    # 7. 再次健康检查
    if ! health_check $inactive_color; then
        log_error "切换后健康检查失败，回滚..."
        kubectl patch service foresight-relayer-prod \
            -n $NAMESPACE \
            -p "{\"spec\":{\"selector\":{\"color\":\"$active_color\"}}}"
        exit 1
    fi
    
    # 8. 缩减旧版本
    log_info "缩减 $active_color 环境..."
    kubectl scale deployment foresight-relayer-$active_color \
        --replicas=0 \
        -n $NAMESPACE
    
    log_info "Blue-Green 部署完成！"
    log_info "活跃环境: $inactive_color"
}

# 回滚函数
rollback() {
    local active_color=$(get_active_color)
    local inactive_color=$(get_inactive_color)
    
    log_warn "执行回滚..."
    
    # 扩展旧版本
    kubectl scale deployment foresight-relayer-$inactive_color --replicas=3 -n $NAMESPACE
    wait_for_deployment "foresight-relayer-$inactive_color" 60
    
    # 切换流量
    kubectl patch service foresight-relayer-prod \
        -n $NAMESPACE \
        -p "{\"spec\":{\"selector\":{\"color\":\"$inactive_color\"}}}"
    
    # 缩减新版本
    kubectl scale deployment foresight-relayer-$active_color --replicas=0 -n $NAMESPACE
    
    log_info "回滚完成"
}

# 参数处理
case "${1:-}" in
    --rollback)
        rollback
        ;;
    --help)
        echo "用法: $0 [镜像名称] [--rollback] [--help]"
        echo ""
        echo "选项:"
        echo "  镜像名称    要部署的新镜像 (默认: foresight/relayer:latest)"
        echo "  --rollback  回滚到上一个版本"
        echo "  --help      显示帮助"
        echo ""
        echo "环境变量:"
        echo "  NAMESPACE   Kubernetes 命名空间 (默认: default)"
        echo "  TIMEOUT     部署超时时间 (默认: 300秒)"
        ;;
    *)
        main
        ;;
esac


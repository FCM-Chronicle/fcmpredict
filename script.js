function parseKoreanNumber(input) {
    const units = {
        '억': 100000000,
        '조': 1000000000000,
        '만': 10000,
    };

    let total = 0;
    let currentNumber = '';
    for (let char of input) {
        if (units[char]) {
            if (currentNumber) {
                total += parseInt(currentNumber) * units[char];
                currentNumber = '';
            } else {
                total += units[char]; // 예: '억' 단독 입력 시
            }
        } else {
            currentNumber += char; // 숫자 부분
        }
    }
    if (currentNumber) {
        total += parseInt(currentNumber);
    }
    return total;
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function calculateExpectedPrice() {
    // 결과 초기화
    document.getElementById('result').innerText = '';

    const currentPrice = parseKoreanNumber(document.getElementById('currentPrice').value);
    const highPrice = parseKoreanNumber(document.getElementById('highPrice').value);
    const lowPrice = parseKoreanNumber(document.getElementById('lowPrice').value);
    const trend = parseFloat(document.getElementById('trend').value);
    const updateFactor = parseFloat(document.getElementById('updateStatus').value);
    const eventFactor = parseFloat(document.getElementById('eventStatus').value);
    const playerFactor = parseFloat(document.getElementById('playerStatus').value);
    
    // 현재 그래프 위치 입력
    const position = document.getElementById('position').value;

    // 매도량과 매수량 입력 (콤마로 구분된 값을 처리)
    const sellVolumeInput = document.getElementById('sellVolume').value.split(',').map(Number);
    const buyVolumeInput = document.getElementById('buyVolume').value.split(',').map(Number);

    // 각각의 매도량과 매수량을 설정
    const sellVolumeHigh = sellVolumeInput[0] || 0;
    const sellVolumeMid = sellVolumeInput[1] || 0;
    const sellVolumeLow = sellVolumeInput[2] || 0;
    const buyVolumeHigh = buyVolumeInput[0] || 0;
    const buyVolumeMid = buyVolumeInput[1] || 0;
    const buyVolumeLow = buyVolumeInput[2] || 0;

    const totalSellVolume = sellVolumeHigh + sellVolumeLow + sellVolumeMid;
    const totalBuyVolume = buyVolumeHigh + buyVolumeLow + buyVolumeMid;

    // 매수량과 매도량이 모두 0일 경우
    if (totalSellVolume === 0 && totalBuyVolume === 0 && document.getElementById('activeTrade').value === "no") {
        document.getElementById('result').innerText = `예상 가격: ${formatNumber(currentPrice.toFixed(0))} TP`;
        return;
    }

    // 가격 조정 로직
    let priceAdjustment = 0;

    // 하한에 매도 매물이 999개일 경우 20% 감소
    if (sellVolumeLow === 999) {
        priceAdjustment -= 0.20; // 가격 20% 감소
    } else {
        // 다른 매도량과 매수량에 따른 조정
        if (sellVolumeLow > 0) {
            priceAdjustment -= 0.01; // 가격 3% 감소
        }
        if (sellVolumeHigh > 0) {
            priceAdjustment += 0.015; // 가격 3% 증가
        }
        if (buyVolumeLow > 0) {
            priceAdjustment -= 0.01; // 가격 3% 감소
        }
        if (buyVolumeHigh > 0) {
            priceAdjustment += 0.015; // 가격 3% 증가
        }
    }

    // 현재 그래프 위치에 따른 부드러운 조정
    if (position === "high") {
        priceAdjustment -= 0.03; // 고점에 가까우면 0.03 감소
    } else if (position === "low") {
        priceAdjustment += 0.06; // 저점에 가까우면 0.03 증가
    }
    // 중간일 경우는 조정 없음

    // 고점과 저점을 이용한 가격 조정
    const priceRange = highPrice - lowPrice;
    if (trend > 0) {
        priceAdjustment += (priceRange * 0.03) / currentPrice; // 상승세일 경우 가격 조정
    } else if (trend < 0) {
        priceAdjustment -= (priceRange * 0.02) / currentPrice; // 하락세일 경우 가격 조정
    }

    // 최종 가격 조정
    let adjustedPrice = currentPrice * (1 + priceAdjustment);

    // 중간 가격 기준 설정
    const midPrice = (highPrice + lowPrice) / 2;

    // 매도량이 500개 이상일 경우 가격 제한
    if (totalSellVolume >= 500) {
        const minPriceLimit = midPrice * 0.70; // 중간 가격의 70%
        if (adjustedPrice < minPriceLimit) {
            adjustedPrice = minPriceLimit; // 최소 가격을 중간 가격의 70%로 설정
        }
    }

    // 출시된 지 얼마나 되었는지에 따른 가중치 조정
    const releaseDuration = parseInt(document.getElementById('releaseDuration').value);
    let weightDecay;
    switch (releaseDuration) {
        case 1: // 1달 이내
            weightDecay = 0.9; // 가중치 그대로
            break;
        case 2: // 2달 이내
            weightDecay = 0.8; // 20% 감소
            break;
        case 3: // 3달 이내
            weightDecay = 0.7; // 30% 감소
            break;
        case 5: // 5달 이내
            weightDecay = 0.5; // 50% 감소
            break;
        case 7: // 7달 이내
            weightDecay = 0.38; // 70% 감소
            break;
        case 12: // 1년 이내
            weightDecay = 0.3; // 80% 감소
            break;
        default:
            weightDecay = 0.2; // 그 외 경우 (1년 초과 등)
            break;
    }

    const adjustedUpdateFactor = updateFactor * weightDecay;

    // 하한작 여부 처리
    let finalPrice = adjustedPrice;
    const isHardLimit = document.getElementById('hardLimit').value;
    if (isHardLimit === "yes") {
        finalPrice *= 0.5; // 가격이 50% 감소
    }

    // 예측 기간 선택
    const predictionDuration = parseInt(document.getElementById('predictionDuration').value);
    
    // 예상 가격 계산
    const totalWeight = adjustedUpdateFactor + eventFactor + playerFactor;
    const expectedPrice = finalPrice * (1 + totalWeight);

    // 예측 가격 계산 (현재와 같은 상황이 지속된다고 가정)
    let priceInFuture = expectedPrice;
    let predictionDetails = ''; // 예측 과정 설명을 위한 변수

    for (let i = 0; i < predictionDuration; i++) {
        // 각 날의 가격 기록
        predictionDetails += `Day ${i + 1}: ${formatNumber(Math.round(priceInFuture))} TP\n`; 
        
        // 효과 감소 로직
        const decayFactor = Math.pow(0.35, i); // 날이 갈수록 효과가 급격히 감소
        priceInFuture *= (1 + totalWeight * decayFactor); // 효과 적용
    }

    // 최종 결과 출력
    document.getElementById('result').innerText = `예상 가격 (${predictionDuration}일 뒤): ${formatNumber(Math.round(priceInFuture))} TP\n\n예측 과정:\n${predictionDetails}`;
}

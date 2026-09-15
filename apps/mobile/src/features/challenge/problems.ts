export type Operator = 'plus' | 'minus' | 'times';

export type Problem = {
  left: number;
  operator: Operator;
  right: number;
  answer: number;
};

const OPERATORS: Operator[] = ['plus', 'minus', 'times'];

const OPERATOR_SYMBOLS: Record<Operator, string> = {
  plus: '+',
  minus: '−',
  times: '×',
};

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createProblem(): Problem {
  const operator = OPERATORS[randomInt(0, OPERATORS.length - 1)] ?? 'plus';
  if (operator === 'times') {
    const left = randomInt(1, 10);
    const right = randomInt(1, 10);
    return { left, operator, right, answer: left * right };
  }
  if (operator === 'minus') {
    // Built from the result so the answer is never negative.
    const right = randomInt(1, 20);
    const answer = randomInt(0, 20);
    return { left: right + answer, operator, right, answer };
  }
  const left = randomInt(1, 20);
  const right = randomInt(1, 20);
  return { left, operator, right, answer: left + right };
}

export function generateProblems(count: number): Problem[] {
  return Array.from({ length: count }, () => createProblem());
}

export function formatProblem({ left, operator, right }: Problem) {
  return `${left} ${OPERATOR_SYMBOLS[operator]} ${right} =`;
}

interface IStatusCode {
  [key: string]: any;
}
export type TCode =
  | 'BAD_ENTRY'
  | 'NOT_AUTHORIZED'
  | 'ERROR'
  | 'FORBIDDEN'
  | 'NOT_FOUND';

export const statusCodes: IStatusCode = {
  BAD_ENTRY: 400,
  NOT_AUTHORIZED: 401,
  ERROR: 500,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
};

export interface InputProps {
  output?: any;
  error?: any;
  message?: string;
  code?: number | TCode;
}
export interface OutputProps {
  status: string;
  output?: any;
  error?: any;
  message?: string;
  code: number;
}

const success = ({ output, error, message, code }: InputProps): OutputProps => {
  let statusCode: number = 200;
  if (typeof code == 'string') {
    if (statusCodes?.[code]) {
      statusCode = statusCodes?.[code];
    }
  }
  return {
    status: 'success',
    code: statusCode,
    message: message ?? 'Successful operation',
    output,
    error,
  };
};

const error = ({ output, error, message, code }: InputProps): OutputProps => {
  let statusCode: number = 500;
  if (typeof code == 'string') {
    if (statusCodes?.[code]) {
      statusCode = statusCodes?.[code];
    }
  } else if (typeof code == 'number') {
    statusCode = code;
  }
  return {
    status: 'error',
    code: statusCode,
    message: message ?? 'Something went wrong',
    output,
    error,
  };
};

const fnOutput = {
  success,
  error,
};

export default fnOutput;

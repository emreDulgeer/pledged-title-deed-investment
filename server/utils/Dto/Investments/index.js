// server/utils/dto/Investments/index.js

const InvestmentDto = require("./InvestmentDto");
const InvestmentListDto = require("./InvestmentListDto");
const InvestmentDetailDto = require("./InvestmentDetailDto");
const InvestmentAdminViewDto = require("./InvestmentAdminViewDto");

module.exports = {
  toInvestmentDto: (investment) => new InvestmentDto(investment),
  toInvestmentListDto: (investment) => new InvestmentListDto(investment),
  toInvestmentDetailDto: (investment) => new InvestmentDetailDto(investment),
  toInvestmentAdminViewDto: (investment) =>
    new InvestmentAdminViewDto(investment),

  toInvestmentListDtoArray: (investments) =>
    investments.map((i) => new InvestmentListDto(i)),
  toInvestmentAdminViewDtoArray: (investments) =>
    investments.map((i) => new InvestmentAdminViewDto(i)),

  InvestmentDto,
  InvestmentListDto,
  InvestmentDetailDto,
  InvestmentAdminViewDto,
};

import DashboardMembershipPlans from "../../components/MembershipPlans/DashboardMembershipPlans";

const OwnerMembershipPlans = () => {
  return (
    <div className="p-4 sm:p-6 xl:p-8">
      <DashboardMembershipPlans role="property_owner" />
    </div>
  );
};

export default OwnerMembershipPlans;

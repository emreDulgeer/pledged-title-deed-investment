import DashboardMembershipPlans from "../../components/MembershipPlans/DashboardMembershipPlans";

const OwnerMembershipPlans = () => {
  return (
    <div className="p-6">
      <DashboardMembershipPlans role="property_owner" />
    </div>
  );
};

export default OwnerMembershipPlans;
